import { expect, test, type Page } from '@playwright/test';
import { fixture, orgId } from './workspace-fixture';
import type { Plan, Coupon, Subscription } from '../src/features/billing/api';
async function switchTo(page: Page, platform: boolean) {
  await page.getByRole('button',{name:'Open profile menu'}).click();
  await page.getByRole('button',{name: platform ? /Platform administration Platform administrator/ : /Willow Academy Teacher administrator/}).click();
}
test('organization review, plans, coupons and manual confirmation unlock the workspace', async ({page}) => {
  const f = await fixture(page,'teacher-admin',true);
  Object.assign(f.org,{approval_status:'pending',accessible:false,billing_status:'pending',features:{live:false,recordings:false,attendance:false,assessments:false}});
  const plans: Plan[] = [], coupons: Coupon[] = [], subscriptions: Subscription[] = [];
  await page.route('https://test.supabase.co/rest/v1/**',async route => {
    const req = route.request(), path = new URL(req.url()).pathname.split('/').pop();
    const body = req.postDataJSON();
    if (path === 'subscription_plans') return route.fulfill({json:plans});
    if (path === 'subscription_coupons') return route.fulfill({json:coupons});
    if (path === 'organization_subscriptions') return route.fulfill({json:subscriptions});
    if (path === 'save_subscription_plan') {
      plans.push({...body.p_plan,id:'plan-1'});
      return route.fulfill({json:'plan-1'});
    }
    if (path === 'save_subscription_coupon') {
      coupons.push({...body.p_coupon,id:'coupon-1'});
      return route.fulfill({json:'coupon-1'});
    }
    if (path === 'review_organization') {
      Object.assign(f.org,{approval_status:'approved',billing_status:'subscription_required'});
      return route.fulfill({json:null});
    }
    if (path === 'quote_subscription' || path === 'request_subscription') {
      if (body.p_code !== 'WELCOME') return route.fulfill({status:400,json:{message:'Coupon is invalid, expired, or not eligible for this organization and plan'}});
      const quote = {plan_id:plans[0].id,plan_name:plans[0].name,coupon_id:coupons[0].id,price_minor:100000,total_minor:50000,currency:'INR',duration_days:30,features:{...plans[0].features,...coupons[0].bonus_features}};
      if (path === 'quote_subscription') return route.fulfill({json:quote});
      subscriptions.push({...quote,id:'sub-1',org_id:orgId,status:'pending_payment',created_at:new Date().toISOString(),starts_at:null,ends_at:null,payment_reference:''});
      Object.assign(f.org,{billing_status:'pending_payment'});
      return route.fulfill({json:'sub-1'});
    }
    if (path === 'confirm_subscription_payment') {
      Object.assign(subscriptions[0],{status:'active',payment_reference:body.p_reference,starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+30*86400000).toISOString()});
      Object.assign(f.org,{accessible:true,billing_status:'active',features:subscriptions[0].features});
      return route.fulfill({json:null});
    }
    await route.fallback();
  });
  await page.goto('/');
  await page.getByLabel('Email address').fill('admin@example.com');
  await page.getByLabel('Password',{exact:true}).fill('test-password');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByText('Awaiting review',{exact:true})).toBeVisible();
  await page.goto('/#/courses');
  await expect(page.getByRole('heading',{name:'Subscription & approval'})).toBeVisible();
  await switchTo(page,true);
  await page.getByRole('button',{name:'Approve organization',exact:true}).click();
  await expect(page.getByRole('button',{name:'Approve organization',exact:true})).toBeDisabled();
  await page.getByRole('link',{name:'Subscription plans',exact:true}).click();
  await page.getByRole('button',{name:'Create plan',exact:true}).click();
  await page.getByLabel('Plan name').fill('Learning Plus');
  await page.getByLabel('Price',{exact:true}).fill('1000');
  await page.getByLabel('Recorded lessons',{exact:true}).check();
  await page.getByRole('button',{name:'Save plan',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Learning Plus',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Coupons',exact:true}).click();
  await page.getByRole('button',{name:'Create coupon',exact:true}).click();
  await page.getByLabel('Coupon code',{exact:true}).fill('WELCOME');
  await page.getByLabel('Discount (%)').fill('50');
  await page.getByLabel('Assessments',{exact:true}).check();
  await page.getByRole('button',{name:'Save coupon',exact:true}).click();
  await expect(page.getByRole('heading',{name:'WELCOME',exact:true})).toBeVisible();
  await switchTo(page,false);
  await page.getByRole('button',{name:/Learning Plus/}).click();
  await page.getByLabel('Coupon code (optional)').fill('INVALID');
  await page.getByRole('button',{name:'Validate and preview'}).click();
  await expect(page.getByRole('alert')).toContainText('Coupon is invalid');
  await page.getByLabel('Coupon code (optional)').fill('WELCOME');
  await page.getByRole('button',{name:'Validate and preview'}).click();
  await expect(page.locator('.billing-quote')).toContainText('Assessments');
  await page.screenshot({path:'artifacts/billing-checkout.png',fullPage:true});
  await page.getByRole('button',{name:'Request payment confirmation'}).click();
  await expect(page.getByText('Awaiting payment confirmation',{exact:true})).toBeVisible();
  await switchTo(page,true);
  await page.getByLabel('Payment reference for Learning Plus').fill('BANK-123');
  await page.getByRole('button',{name:'Confirm received payment'}).click();
  await expect(page.getByText('Payment reference: BANK-123')).toBeVisible();
  await switchTo(page,false);
  await expect(page.getByRole('heading',{name:'Good to see you, Maya.'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Assessments',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Subscription',exact:true}).click();
  await expect(page.getByText('Active subscription',{exact:true})).toBeVisible();
});
