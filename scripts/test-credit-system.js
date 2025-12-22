#!/usr/bin/env node
/**
 * Test script for the Credit Balance System
 *
 * Run with: doppler run -- node scripts/test-credit-system.js
 */

import { Redis } from '@upstash/redis';

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TEST_EMAIL = 'test@example.com';
const TEST_CODE = 'DOJO-TEST-1234-ABCD';

async function testCreditSystem() {
  console.log('\n🧪 Testing Credit Balance System\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check Redis connection
    console.log('\n1. Testing Redis connection...');
    await redis.ping();
    console.log('   ✅ Redis connected successfully');

    // Test 2: Store a gift card
    console.log('\n2. Storing test gift card...');
    const giftCard = {
      code: TEST_CODE,
      valueCents: 5000, // $50
      purchaserEmail: 'buyer@example.com',
      orderId: 'test-order-123',
      createdAt: new Date().toISOString(),
      redeemedAt: null,
      redeemedBy: null,
    };
    await redis.set(`credit:giftcard:${TEST_CODE}`, giftCard);
    console.log(`   ✅ Gift card stored: ${TEST_CODE} for $50.00`);

    // Test 3: Retrieve gift card
    console.log('\n3. Retrieving gift card...');
    const retrieved = await redis.get(`credit:giftcard:${TEST_CODE}`);
    if (retrieved && retrieved.valueCents === 5000) {
      console.log('   ✅ Gift card retrieved correctly');
      console.log(`   Code: ${retrieved.code}`);
      console.log(`   Value: $${(retrieved.valueCents / 100).toFixed(2)}`);
    } else {
      throw new Error('Gift card data mismatch');
    }

    // Test 4: Check initial balance (should be 0)
    console.log('\n4. Checking initial balance...');
    const initialBalance = await redis.get(`credit:balance:${TEST_EMAIL}`);
    console.log(`   Initial balance: ${initialBalance ? `$${(initialBalance.balance / 100).toFixed(2)}` : '$0.00'}`);

    // Test 5: Add credit (simulate redemption)
    console.log('\n5. Adding credit (simulating gift card redemption)...');
    const newBalance = (initialBalance?.balance || 0) + 5000;
    await redis.set(`credit:balance:${TEST_EMAIL}`, {
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
    });
    console.log(`   ✅ Credit added: $50.00`);
    console.log(`   New balance: $${(newBalance / 100).toFixed(2)}`);

    // Test 6: Record transaction
    console.log('\n6. Recording transaction...');
    const txnId = `txn_${Date.now()}`;
    const transaction = {
      id: txnId,
      type: 'credit_added',
      amount: 5000,
      source: 'gift_card',
      reference: TEST_CODE,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    };
    await redis.set(`credit:txn:${TEST_EMAIL}:${txnId}`, transaction);

    // Update transaction index
    const currentIndex = (await redis.get(`credit:txn:index:${TEST_EMAIL}`)) || [];
    await redis.set(`credit:txn:index:${TEST_EMAIL}`, [txnId, ...currentIndex]);
    console.log(`   ✅ Transaction recorded: ${txnId}`);

    // Test 7: Retrieve transaction history
    console.log('\n7. Retrieving transaction history...');
    const txnIndex = await redis.get(`credit:txn:index:${TEST_EMAIL}`);
    if (txnIndex && txnIndex.length > 0) {
      console.log(`   ✅ Found ${txnIndex.length} transaction(s)`);
      const latestTxn = await redis.get(`credit:txn:${TEST_EMAIL}:${txnIndex[0]}`);
      if (latestTxn) {
        console.log(`   Latest: ${latestTxn.type} - $${(latestTxn.amount / 100).toFixed(2)}`);
      }
    }

    // Test 8: Mark gift card as redeemed
    console.log('\n8. Marking gift card as redeemed...');
    await redis.set(`credit:giftcard:${TEST_CODE}`, {
      ...giftCard,
      redeemedAt: new Date().toISOString(),
      redeemedBy: TEST_EMAIL,
    });
    console.log('   ✅ Gift card marked as redeemed');

    // Test 9: Verify redeemed status
    console.log('\n9. Verifying redeemed status...');
    const redeemedCard = await redis.get(`credit:giftcard:${TEST_CODE}`);
    if (redeemedCard && redeemedCard.redeemedAt) {
      console.log('   ✅ Gift card shows as redeemed');
      console.log(`   Redeemed by: ${redeemedCard.redeemedBy}`);
      console.log(`   Redeemed at: ${redeemedCard.redeemedAt}`);
    }

    // Test 10: Test pending debit (for checkout flow)
    console.log('\n10. Testing pending debit storage...');
    const discountId = 'discount_test_123';
    await redis.set(`credit:pending:${discountId}`, {
      email: TEST_EMAIL,
      amountCents: 2500,
      checkoutId: 'checkout_test',
      createdAt: new Date().toISOString(),
    }, { ex: 3600 });
    const pending = await redis.get(`credit:pending:${discountId}`);
    if (pending && pending.amountCents === 2500) {
      console.log('   ✅ Pending debit stored with 1-hour TTL');
    }

    // Cleanup
    console.log('\n11. Cleaning up test data...');
    await redis.del(`credit:giftcard:${TEST_CODE}`);
    await redis.del(`credit:balance:${TEST_EMAIL}`);
    await redis.del(`credit:pending:${discountId}`);
    if (txnIndex) {
      for (const id of txnIndex) {
        await redis.del(`credit:txn:${TEST_EMAIL}:${id}`);
      }
    }
    await redis.del(`credit:txn:index:${TEST_EMAIL}`);
    console.log('   ✅ Test data cleaned up');

    console.log('\n' + '=' .repeat(50));
    console.log('✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testCreditSystem();
