import { test, expect, Page } from '@playwright/test';
import jwt from 'jsonwebtoken';
import { document, documentId, node } from './fixtures';

const secret = process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET || 'dev-secret-change-me';
const user = { sub: '507f1f77bcf86cd799439011', name: 'Review administrator', email: 'review@example.test', role: 'ADMIN' };

async function fixtureApis(page: Page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let response: unknown = {};
    if (url.pathname === '/api/auth/session') response = { user };
    else if (url.pathname === '/api/documents/ingest') response = url.searchParams.has('id') ? document : { documents: [document], totalCount: 1 };
    else if (url.pathname.endsWith('/nodes')) response = { nodes: [node], total: 1 };
    else if (url.pathname === '/api/chat') response = { messages: [], citations: [] };
    else if (url.pathname === '/api/actions') response = { actions: [{ id:'action-review', documentId, documentTitle:document.title, action:'Resolve review comments.', team:'Operations', dueDate:'20 October 2026' }] };
    else if (url.pathname === '/api/users') response = { users: [{ id:'user-review', name:user.name, email:user.email, role:'ADMIN', department:'OPERATIONS' }] };
    else if (url.pathname === '/api/audit') response = { logs: [], total:0 };
    else if (url.pathname === '/api/search/vector') response = { results: [] };
    await route.fulfill({ json: response });
  });
}

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([{ name:'kmrl_session', value:jwt.sign(user,secret,{expiresIn:3600}), domain:'localhost', path:'/' }]);
  await fixtureApis(page);
});

test('document views retain source content, section navigation and URL state', async ({ page }) => {
  await page.goto(`/documents/${documentId}`);
  await expect(page.getByRole('heading',{name:document.title})).toBeVisible();
  await page.getByRole('button',{name:'Sections (1)',exact:true}).click();
  await expect(page).toHaveURL(/tab=sections/);
  await expect(page.getByRole('navigation',{name:'Document sections'})).toBeVisible();
  await page.getByText('Read source text · Pages 1–1',{exact:true}).click();
  await expect(page.getByText(node.content,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Source',exact:true}).click();
  await expect(page.getByText(node.content,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Activity',exact:true}).click();
  await expect(page.getByText('Added to workspace',{exact:true})).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button',{name:'Source',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Split view',exact:true}).click();
  await expect(page.getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
});

test('document question submits once and keeps document scope', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/chat', async route => {
    if (route.request().method() === 'GET') return route.fulfill({json:{messages:[],citations:[]}});
    requests++;
    expect(route.request().postDataJSON().docId).toBe(documentId);
    await route.fulfill({json:{reply:'The owner resolves review comments.',sessionId:'review-chat',citations:[{index:1,docId:documentId,nodeId:'chunk-1',title:document.title,pageRange:{start:1,end:1}}]}});
  });
  await page.goto('/documents');
  await page.getByRole('button',{name:'Ask',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Ask DocSetu'}).getByText('The owner resolves review comments.',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:/Source document|regional operations/}).last()).toBeVisible();
  // Wait beyond a completed response render to detect the former effect resubmission loop.
  await page.waitForTimeout(600);
  expect(requests).toBe(1);
});

test('translation failure remains an error without a fabricated translation', async ({ page }) => {
  await page.route('**/api/translate',route=>route.fulfill({status:503,json:{error:'Translation request failed.'}}));
  await page.goto(`/documents/${documentId}`);
  await page.getByRole('button',{name:'Translate',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Translate content'});
  await dialog.getByRole('button',{name:'Translate',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('Translation is unavailable');
  await expect(dialog.getByRole('heading',{name:/Translation ·/})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button',{name:'Translate',exact:true})).toBeFocused();
});

test('pasted ingestion preserves commas and language through success', async ({ page }) => {
  const text='Review contracts, circulars, and reports before 20 October 2026.';
  await page.route('**/api/documents/ingest',async route=>{
    if(route.request().method()==='GET') return route.fulfill({json:{documents:[document],totalCount:1}});
    const body=route.request().postDataJSON();
    expect(body.documents[0].content).toBe(text);
    expect(body.language).toBe('Hindi');
    await route.fulfill({status:201,json:{documentId}});
  });
  await page.goto('/home');
  await page.getByRole('button',{name:'Add document',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Add document'});
  await dialog.getByRole('button',{name:'Paste text',exact:true}).click();
  await dialog.getByLabel('Document text',{exact:true}).fill(text);
  await dialog.getByRole('button',{name:'Continue to details'}).click();
  await dialog.getByLabel('Document title',{exact:true}).fill('Review procedure');
  await dialog.getByRole('combobox',{name:'Language',exact:true}).selectOption('Hindi');
  await dialog.getByRole('button',{name:'Add document',exact:true}).click();
  await expect(dialog.getByRole('heading',{name:'Document added'})).toBeVisible();
});

test('collection search and empty results work from URL and input',async({page})=>{
  await page.goto('/documents?q=not-a-document');
  await expect(page.getByRole('heading',{name:'No documents to show'})).toBeVisible();
  await page.getByRole('button',{name:'Clear filters',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:document.title})).toBeVisible();
  await page.getByRole('button',{name:'Grid view',exact:true}).click();
  await expect(page.getByRole('button',{name:'Grid view',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('action progress persists after reload',async({page})=>{
  await page.goto('/actions');
  await page.getByRole('checkbox').check();
  await page.reload();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.getByRole('button',{name:/Completed/}).click();
  await expect(page.getByRole('heading',{name:'Resolve review comments.'})).toBeVisible();
});

test('mobile pages keep content within the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const path of ['/','/home','/documents',`/documents/${documentId}`,'/intelligence','/actions','/people','/access','/audit']){
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>window.document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  await page.getByRole('button',{name:'Toggle navigation'}).click();
  await expect(page.getByRole('navigation',{name:'Workspace navigation'})).toBeVisible();
  await page.getByRole('navigation',{name:'Workspace navigation'}).getByRole('link',{name:'Documents',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Workspace navigation'})).not.toBeVisible();
});

test('demo credentials and password visibility remain available',async({page,context})=>{
  await context.clearCookies();
  await page.goto('/login');
  await page.getByRole('button',{name:'Demo administrator'}).click();
  await expect(page.getByLabel('Work email',{exact:true})).toHaveValue('admin@example.com');
  await page.getByRole('button',{name:'Show password'}).click();
  await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Demo manager'}).click();
  await expect(page.getByLabel('Work email',{exact:true})).toHaveValue('vin@gmail.com');
});

test('file ingestion reads text and supports draft discard', async ({ page }) => {
  await page.goto('/documents');
  await page.getByRole('button',{name:'Add document',exact:true}).last().click();
  const dialog = page.getByRole('dialog',{name:'Add document'});
  await dialog.locator('input[type=file]').setInputFiles({name:'review.txt',mimeType:'text/plain',buffer:Buffer.from('First, second, and third requirements.')});
  await expect(dialog.getByLabel('Document title',{exact:true})).toHaveValue('review');
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('heading',{name:'Discard this draft?'})).toBeVisible();
  await dialog.getByRole('button',{name:'Keep editing'}).click();
  await page.route('**/api/documents/ingest',async route=>{
    expect(route.request().postDataJSON().documents[0].content).toBe('First, second, and third requirements.');
    await route.fulfill({status:201,json:{documentId}});
  });
  await dialog.getByRole('button',{name:'Add document',exact:true}).click();
  await expect(dialog.getByRole('heading',{name:'Document added'})).toBeVisible();
});

test('document deletion requires confirmation and handles permission errors',async({page})=>{
  await page.route(`**/api/documents/${documentId}`,route=>route.fulfill({status:403,json:{error:'Forbidden'}}));
  await page.goto('/documents');
  await page.getByRole('button',{name:`Remove ${document.title}`,exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Remove document?'});
  await dialog.getByRole('button',{name:'Remove document',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('Check your access');
  await dialog.getByRole('button',{name:'Keep document'}).click();
  await expect(page.getByRole('heading',{name:document.title})).toBeVisible();
});

test('people form validates and sends supported role',async({page})=>{
  await page.goto('/people');
  await page.getByRole('button',{name:'Add team member'}).click();
  const dialog=page.getByRole('dialog',{name:'Add team member'});
  await dialog.getByRole('textbox',{name:'Name',exact:true}).fill('Review colleague');
  await dialog.getByRole('textbox',{name:'Work email'}).fill('colleague@example.test');
  await page.route('**/api/users',async route=>{
    if(route.request().method()==='GET') return route.fulfill({json:{users:[]}});
    expect(route.request().postDataJSON().role).toBe('MANAGER');
    await route.fulfill({status:201,json:{id:'test-person',name:'Review colleague'}});
  });
  await dialog.getByRole('button',{name:'Add team member',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Review colleague was added'})).toBeVisible();
});

test('access request success preserves form contract without sending email',async({page,context})=>{
  await context.clearCookies();
  await page.route('**/api/requests',async route=>{
    expect(route.request().postDataJSON().organizationName).toBe('Review organization');
    await route.fulfill({status:201,json:{ok:true}});
  });
  await page.goto('/request-deployment');
  await page.getByRole('textbox',{name:'Organization *',exact:true}).fill('Review organization');
  await page.getByRole('textbox',{name:'Contact name *',exact:true}).fill('Review contact');
  await page.getByRole('textbox',{name:'Work email *',exact:true}).fill('review@example.test');
  await page.getByRole('textbox',{name:'What does your team need? *'}).fill('Document review and approval workspace.');
  await page.getByRole('button',{name:'Send access request'}).click();
  await expect(page.getByRole('heading',{name:'Request received'})).toBeVisible();
});

test('manager navigation and server redirects enforce administrator routes',async({page,context})=>{
  await context.addCookies([{name:'kmrl_session',value:jwt.sign({...user,role:'MANAGER'},secret,{expiresIn:3600}),domain:'localhost',path:'/'}]);
  await page.route('**/api/auth/session',route=>route.fulfill({json:{user:{...user,role:'MANAGER'}}}));
  await page.goto('/people');
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('link',{name:'People',exact:true})).toHaveCount(0);
  await page.goto('/audit');
  await expect(page).toHaveURL(/\/home$/);
  await page.goto('/dashboard/documents');
  await expect(page).toHaveURL(/\/documents$/);
});
