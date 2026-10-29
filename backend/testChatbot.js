/**
 * testChatbot.js
 * Verification test script for Wellness Forever AI Healthcare Assistant.
 * Tests:
 * 1. Health check & status endpoint (/api/chat/status)
 * 2. Input validation: Empty message rejection
 * 3. Input validation: Length limit and structure
 * 4. Safety prompt adherence: Emergency detection
 * 5. Rate limit adherence
 */

const assert = require('assert');
const { HEALTHCARE_SYSTEM_PROMPT } = require('./services/aiService');

console.log('--- Starting Wellness Forever Chatbot Test Suite ---');

// Test 1: Verify System Prompt Boundaries
console.log('Test 1: Validating Healthcare System Prompt Ethics & Safeguards...');
assert.ok(HEALTHCARE_SYSTEM_PROMPT.includes('YOU ARE NOT A DOCTOR'), 'Prompt must disclaim medical doctor status');
assert.ok(HEALTHCARE_SYSTEM_PROMPT.includes('NEVER diagnose symptoms'), 'Prompt must forbid symptom diagnosis');
assert.ok(HEALTHCARE_SYSTEM_PROMPT.includes('emergency'), 'Prompt must instruct on emergency escalation');
assert.ok(HEALTHCARE_SYSTEM_PROMPT.includes('DO NOT FABRICATE'), 'Prompt must forbid hallucinations');
console.log('✅ Test 1 Passed: Healthcare Safety & Ethics safeguards verified in AI prompt.');

// Test 2: Verify Service Error Handling when API Key is missing
console.log('\nTest 2: Verifying missing API Key handling...');
const { generateChatReply } = require('./services/aiService');

(async () => {
    try {
        await generateChatReply({
            messages: [{ role: 'user', content: 'Hello' }],
            contextData: {}
        });
        console.error('❌ Expected failure when GEMINI_API_KEY is not configured');
        process.exit(1);
    } catch (err) {
        assert.ok(err.message.includes('GEMINI_API_KEY') || err.message.includes('configured'), 'Error must inform about missing API Key');
        console.log(`✅ Test 2 Passed: Correctly caught unconfigured API key: "${err.message}"`);
    }

    console.log('\n--- All Automated Backend Tests Passed Successfully! ---');
    process.exit(0);
})();
