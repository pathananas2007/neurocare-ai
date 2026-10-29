/**
 * aiService.js
 * Modular AI Provider Service for Wellness Forever.
 * 
 * Supports:
 * - Google Gemini (default provider via REST API using native fetch, requiring no extra heavyweight npm packages)
 * - Groq / OpenAI compatible fallback
 * 
 * Safe, zero PII leakage, temperature & token controlled, error resilient.
 */

const https = require('https');

// System prompt enforcing healthcare safety, boundaries, and brand guidelines
const HEALTHCARE_SYSTEM_PROMPT = `You are "Aura", the official AI Healthcare Assistant for "Wellness Forever" — a premier Doctor Appointment & Healthcare Booking platform.

CORE IDENTITY & ETHICS:
1. You are an AI assistant designed to help patients navigate the website, understand specialties, find doctors, explain booking/cancellation procedures, and answer general healthcare inquiries.
2. YOU ARE NOT A DOCTOR. Clearly and gently remind users of this when appropriate.
3. NEVER diagnose symptoms, prescribe medications, recommend specific drug dosages, or replace professional medical consultation.
4. If a user describes severe, acute, or life-threatening symptoms (e.g. chest pain, severe shortness of breath, sudden numbness, uncontrolled bleeding, stroke symptoms):
   - Immediately advise them to call local emergency services (like 112 / 102 / 911) or visit the nearest emergency room.
   - Do NOT offer wait-and-see advice for emergencies.

GROUNDED PLATFORM KNOWLEDGE (DO NOT FABRICATE):
- Specialties available: Cardiology, Dermatology, General Physician, Neurology, Orthopedics, Pediatrics, Gynecology, Psychiatry, ENT.
- Booking steps:
  1. Browse doctors or click "Find Doctors" on the Home page.
  2. Filter by specialty or search by name.
  3. Click "Book Appointment" on the doctor's card.
  4. Select consultation date & available time slot, fill patient details, and confirm.
- Managing appointments:
  - Users can view and cancel their booked appointments on the "My Appointments" page (/appointments.html).
  - To cancel, navigate to "My Appointments", find the appointment card, and click "Cancel Appointment".
- NEVER invent doctor names, consultation fees, or open time slots out of thin air. Only reference the doctors and data explicitly provided to you in the context.

TONE & STYLE:
- Warm, compassionate, polite, and reassuring.
- Professional, clear, concise, and easy to read (use bullet points when listing steps).
- Maintain Wellness Forever's caring philosophy: "Your Health, Our Priority".`;

/**
 * Call Google Gemini API using native https/fetch
 */
async function callGemini({ apiKey, model, messages, systemInstruction }) {
    const modelName = model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    // Build conversation history - combine system instruction with first user message if needed
    const contents = [];
    
    // For Gemini, we prepend system instruction as first user message for context
    if (systemInstruction && messages.length > 0) {
        contents.push({
            role: 'user',
            parts: [{ text: systemInstruction + '\n\n' + messages[0].content }]
        });
        
        // Add remaining messages
        for (let i = 1; i < messages.length; i++) {
            contents.push({
                role: messages[i].role === 'assistant' ? 'model' : 'user',
                parts: [{ text: messages[i].content }]
            });
        }
    } else {
        // Map conversation history to Gemini contents format
        messages.forEach(msg => {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        });
    }

    const payload = {
        contents,
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
            topP: 0.8
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMsg = data.error?.message || `Gemini API responded with status ${response.status}`;
        throw new Error(errorMsg);
    }

    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error('Received an empty response from the AI provider.');
    }

    return candidate.content.parts[0].text;
}

/**
 * Call Groq API (as pluggable alternative provider)
 */
async function callGroq({ apiKey, model, messages, systemInstruction }) {
    const modelName = model || process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

    const formattedMessages = [];
    if (systemInstruction) {
        formattedMessages.push({ role: 'system', content: systemInstruction });
    }
    messages.forEach(m => formattedMessages.push({ role: m.role, content: m.content }));

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            messages: formattedMessages,
            temperature: 0.3,
            max_tokens: 800
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || `Groq API responded with status ${response.status}`);
    }

    return data.choices?.[0]?.message?.content || 'No response returned.';
}

/**
 * Main generateChatReply dispatcher
 */
async function generateChatReply({ messages, contextData = {} }) {
    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

    // Construct enriched system prompt with verified live platform context
    let dynamicContext = HEALTHCARE_SYSTEM_PROMPT;

    if (contextData.doctors && contextData.doctors.length > 0) {
        dynamicContext += `\n\nCURRENT VERIFIED DOCTORS ON PLATFORM:\n`;
        contextData.doctors.forEach(doc => {
            dynamicContext += `- Dr. ${doc.name} (${doc.specialization}), Experience: ${doc.experience || 'Experienced'}, Location: ${doc.location || 'Main Clinic'}, Fee: ₹${doc.fee || 0}, Rating: ${doc.rating || 5}★\n`;
        });
    }

    if (contextData.userAppointments && contextData.userAppointments.length > 0) {
        dynamicContext += `\n\nAUTHENTICATED USER'S UPCOMING APPOINTMENTS:\n`;
        contextData.userAppointments.forEach(apt => {
            dynamicContext += `- Doctor: Dr. ${apt.doctorName}, Date: ${apt.date}, Time: ${apt.time}, Status: ${apt.status}\n`;
        });
    } else if (contextData.isAuthenticated) {
        dynamicContext += `\n\nAUTHENTICATED USER: User is logged in but currently has no active booked appointments.`;
    }

    if (provider === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
            throw new Error('GEMINI_API_KEY is not configured on the server. Please add your Gemini API key in backend/.env');
        }

        return await callGemini({
            apiKey,
            model: process.env.GEMINI_MODEL,
            messages,
            systemInstruction: dynamicContext
        });
    } else if (provider === 'groq') {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('GROQ_API_KEY is not configured on the server.');
        }

        return await callGroq({
            apiKey,
            model: process.env.GROQ_MODEL,
            messages,
            systemInstruction: dynamicContext
        });
    } else {
        throw new Error(`Unsupported AI_PROVIDER: "${provider}". Use "gemini" or "groq".`);
    }
}

module.exports = {
    generateChatReply,
    HEALTHCARE_SYSTEM_PROMPT
};
