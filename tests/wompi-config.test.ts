import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Exercise real server-only configuration in a clean process, without merchant credentials.
test('Wompi reads production keys at runtime, rejects mixed environments and verifies from the server', () => {
  const source = `
    import assert from 'node:assert/strict';
    import { subscriptionCheckoutReady, wompiConfig, fetchWompiTransaction } from './src/lib/payments/wompi-config.ts';
    assert.equal(subscriptionCheckoutReady(),false);
    process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY='pub_prod_fixture';
    assert.equal(subscriptionCheckoutReady(),true);
    process.env.WOMPI_PUBLIC_KEY='pub_test_fixture';
    assert.equal(subscriptionCheckoutReady(),false);
    process.env.WOMPI_PUBLIC_KEY='pub_prod_runtime';
    assert.equal(subscriptionCheckoutReady(),true);
    assert.equal(wompiConfig().publicKey,'pub_prod_runtime');
    let calls=0;
    globalThis.fetch=async(url,options)=>{
      calls++;
      assert.equal(url,'https://production.wompi.co/v1/transactions/fixture-transaction');
      assert.equal(options.headers.Authorization,'Bearer prv_prod_fixture');
      assert.equal(options.cache,'no-store');
      return Response.json({data:{id:'fixture-transaction',status:'PENDING'}});
    };
    assert.equal((await fetchWompiTransaction('fixture-transaction')).status,'PENDING');
    await assert.rejects(()=>fetchWompiTransaction('../../arbitrary'),/identificador/);
    assert.equal(calls,1);
    globalThis.fetch=async()=>Response.json({data:{id:'different-transaction'}});
    await assert.rejects(()=>fetchWompiTransaction('fixture-transaction'),/no corresponde/);
  `;
  const result = spawnSync(process.execPath,['--conditions=react-server','--import','tsx','--input-type=module','-e',source],{
    cwd: new URL('..',import.meta.url),encoding:'utf8',env:{...process.env,
      WOMPI_PUBLIC_KEY:'',NEXT_PUBLIC_WOMPI_PUBLIC_KEY:'',WOMPI_PRIVATE_KEY:'prv_prod_fixture',
      WOMPI_INTEGRITY_SECRET:'prod_integrity_fixture',WOMPI_EVENTS_SECRET:'prod_events_fixture',WOMPI_ENVIRONMENT:'production',
    },
  });
  assert.equal(result.status,0,result.stderr);
});
