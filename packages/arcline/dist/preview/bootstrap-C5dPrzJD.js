function e(e){return new Worker(``+new URL(`worker-8M5K2e8r.js`,import.meta.url).href,{name:e?.name})}function t(e){throw Error(`web boot: unknown index injection row ${JSON.stringify(e)}`)}async function n(e,n){for(let r of e)switch(r.kind){case`global`:globalThis[r.name]=r.value;break;case`script`:{let e=document.createElement(`script`);e.textContent=r.text,(r.placement===`head`?document.head:document.body).append(e);break}case`script-src`:await n(r.src);break;case`script-preload`:break;case`style`:{let e=document.createElement(`style`);e.textContent=r.text,document.head.append(e);break}case`html`:(r.placement===`head`?document.head:document.body).insertAdjacentHTML(`beforeend`,r.html);break;default:t(r)}}var r=`vfs-image.tar.gz`;function i(e){return typeof e==`object`&&e&&!Array.isArray(e)?e:void 0}function a(e){let t=i(e);if(t?.version!==1||!Array.isArray(t.fixtures))throw Error(`preview fixture manifest must use version 1`);let n=[],r=new Set;for(let e of t.fixtures){let t=i(e),a=t?.id,o=t?.label,s=t?.description,c=t?.overlays,l=Array.isArray(c)?c.filter(e=>typeof e==`string`&&e.length>0):[];if(typeof a!=`string`||!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(a)||a===`none`||a===`webfs`||typeof o!=`string`||o.length===0||typeof s!=`string`||s.length===0||!Array.isArray(c)||c.length===0||l.length!==c.length)throw Error(`preview fixture manifest contains an invalid fixture entry`);if(r.has(a))throw Error(`preview fixture manifest repeats id "${a}"`);r.add(a),n.push({id:a,label:o,description:s,overlays:l})}let a=t.defaultFixture;if(a!==null&&(typeof a!=`string`||!r.has(a)))throw Error(`preview fixture manifest defaultFixture does not name a fixture`);return{version:1,defaultFixture:a,fixtures:n}}new TextEncoder;var o=new TextDecoder,s=512;function c(e,t,n){let r=t;for(;r<t+n&&e[r]!==0;)r+=1;return o.decode(e.subarray(t,r))}function l(e){let t=[],n=0;for(;n+s<=e.length;){let r=e.subarray(n,n+s);if(r.every(e=>e===0))break;let i=c(r,0,100),a=c(r,345,155),o=a===``?i:`${a}/${i}`,l=Number.parseInt(c(r,124,12).trim()||`0`,8),u=Number.parseInt(c(r,100,8).trim()||`0`,8)&511,d=r[156],f=d===53||o.endsWith(`/`);if(d!==48&&d!==0&&d!==53)throw Error(`vfs tar: unsupported entry type ${String.fromCharCode(d??0)} for "${o}"`);let p=n+s;t.push({name:o,bytes:e.subarray(p,p+l),directory:f,mode:u}),n=p+Math.ceil(l/s)*s}return t}var u=new Map([[`.svg`,`image/svg+xml`],[`.png`,`image/png`],[`.webp`,`image/webp`],[`.jpg`,`image/jpeg`],[`.jpeg`,`image/jpeg`]]);function d(e){let t=new Map;for(let n of l(e)){let[,e,r]=/^plugins\/((?:@[^/]+\/)?[^/]+)\/assets\/(.+)$/u.exec(n.name)??[];if(e===void 0||r===void 0)continue;let i=`plugins/${e}/assets/${r.split(`/`).map(e=>encodeURIComponent(e).replace(/[!'()*]/gu,e=>`%${e.charCodeAt(0).toString(16).toUpperCase()}`)).join(`/`)}`,a=r.slice(r.lastIndexOf(`.`)).toLowerCase();t.set(i,URL.createObjectURL(new Blob([new Uint8Array(n.bytes)],{type:u.get(a)??``})))}return e=>t.get(e)??e}var f=`
  [data-preview-text-viewer] {
    width: min(960px, calc(100vw - 32px));
    height: min(720px, calc(100dvh - 32px));
    padding: 0;
    box-sizing: border-box;
    border: 1px solid var(--dsw-alias-border-l2, rgb(0 0 0 / 10%));
    border-radius: var(--dsw-radius-lg, 16px);
    color: var(--dsw-alias-label-primary, #0f1115);
    background: var(--dsw-alias-bg-base, #fff);
    font-family: var(--dsw-font-family, inherit);
  }
  [data-preview-text-viewer][open] { display: flex; flex-direction: column; }
  [data-preview-text-viewer]::backdrop { background: rgb(0 0 0 / 32%); }
  [data-preview-text-viewer] header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--dsw-alias-border-l1, rgb(0 0 0 / 6%));
  }
  [data-preview-text-viewer] h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: 14px;
    line-height: 22px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  [data-preview-text-viewer] button {
    height: 28px;
    padding: 0 12px;
    border: 1px solid var(--dsw-alias-border-l2, rgb(0 0 0 / 10%));
    border-radius: var(--dsw-radius-sm, 8px);
    color: inherit;
    background: transparent;
    font: inherit;
    cursor: pointer;
  }
  [data-preview-text-viewer] pre {
    flex: 1;
    margin: 0;
    padding: 16px;
    overflow: auto;
    background: var(--dsw-alias-markdown-code-block, transparent);
    font: 13px/20px ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre;
  }
`;function p(e,t){let n=document.querySelector(`dialog[data-preview-text-viewer]`);if(n===null){let e=document.createElement(`style`);e.textContent=f,document.head.append(e),n=document.createElement(`dialog`),n.dataset.previewTextViewer=``;let t=document.createElement(`header`),r=document.createElement(`h2`),i=document.createElement(`button`);i.type=`button`,i.textContent=`Close`;let a=n;i.addEventListener(`click`,()=>{a.close()}),n.addEventListener(`keydown`,e=>{e.stopPropagation()}),t.append(r,i),n.append(t,document.createElement(`pre`)),document.body.append(n)}let r=n.querySelector(`h2`);r.textContent=e,r.title=e,n.querySelector(`pre`).textContent=t,n.open||n.showModal()}var m=class extends Error{dshRemoteStreamFailure;constructor(e,t){super(e.message,t),this.name=`TunnelLogicalStreamError`,this.dshRemoteStreamFailure=e.kind===`remote`?{kind:`remote`,code:e.code,details:e.details}:{kind:`carrier`}}},h=class{frames=[];wake;failed=!1;failure;push(e){this.failed||(this.frames.push(e),this.wake?.(),this.wake=void 0)}fail(e){this.failed||(this.failed=!0,this.failure=e,this.frames.length=0,this.wake?.(),this.wake=void 0)}async next(){for(;this.frames.length===0;){if(this.failed)throw this.failure;await new Promise(e=>{this.wake=e})}return this.frames.shift()}},g=500,_=new TextEncoder,v=/\/\/# sourceMappingURL=([^\r\n]+)\s*$/;function y(e){let t=new FileReader;return new Promise((n,r)=>{t.addEventListener(`load`,()=>{n(t.result)},{once:!0}),t.addEventListener(`error`,()=>{r(t.error??Error(`source map encoding failed`))},{once:!0}),t.readAsDataURL(new Blob([e],{type:`application/json;charset=utf-8`}))})}async function b(e,t,n){let r=v.exec(e);if(r?.[1]===void 0)return e;try{let i=await n(new URL(r[1],new URL(t,globalThis.location.origin)));if(!i.ok)return e.replace(v,``);let a=await y(await i.arrayBuffer());return e.replace(v,`//# sourceMappingURL=${a}`)}catch{return e.replace(v,``)}}function x(e){if(e!=null){if(typeof e==`string`)return _.encode(e).buffer;if(e instanceof Blob||e instanceof ReadableStream||e instanceof ArrayBuffer)return e;if(ArrayBuffer.isView(e))return e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength);throw Error(`web-preview tunnel: unsupported request body ${Object.prototype.toString.call(e)}`)}}var S=new Set([101,204,205,304]),C=class{worker;nextId=1;unary=new Map;bodyStreams=new Map;logicalStreams=new Map;inFlight=new Map;releases=new Map;constructor(e){this.worker=e,e.addEventListener(`message`,e=>{this.receive(e.data)}),e.addEventListener(`error`,e=>{let t=Error(`web-preview tunnel: worker failed: ${e.message}`);for(let t of this.inFlight.keys())this.warnRefusal(t,`worker failed: ${e.message}`);this.inFlight.clear();for(let e of this.unary.values())e.reject(t);this.unary.clear();for(let e of this.bodyStreams.values())e.error(t);this.bodyStreams.clear();let n=new m({kind:`carrier`,message:`web-preview tunnel: worker failed: ${e.message}`},{cause:t});for(let{inbox:e}of this.logicalStreams.values())e.fail(n);this.logicalStreams.clear();for(let e of this.releases.values())e();this.releases.clear()})}init(e,t=[]){this.worker.postMessage({t:`init`,image:e,overlays:t})}fetch=async(e,t)=>{let n=t?.signal;if(n?.aborted===!0)throw new DOMException(`The operation was aborted.`,`AbortError`);let r=this.nextId++,i=t?.body===void 0||t.body===null?void 0:x(t.body),a={t:`req`,id:r,method:t?.method??`GET`,url:new URL(e,globalThis.location.origin).toString(),headers:Object.fromEntries(new Headers(t?.headers).entries()),...i===void 0?{}:{body:i}},o=new Promise((e,t)=>{this.unary.set(r,{resolve:e,reject:t})});if(this.inFlight.set(r,`${a.method} ${a.url}`),i instanceof ReadableStream?this.worker.postMessage(a,[i]):this.worker.postMessage(a),n==null)return await o;let s=this.rejectOnAbort(r,n);try{let e=await Promise.race([o,s.rejected]);return this.bodyStreams.has(r)&&this.observeStreamAbort(r,n),e}finally{s.release()}};async*open(e,t,n,r){n.throwIfAborted();let i=this.nextId++,a=new h,o={inbox:a,pump:void 0},s=!1,c=!1,l=()=>{a.fail(n.reason)};n.addEventListener(`abort`,l,{once:!0}),this.logicalStreams.set(i,o),this.inFlight.set(i,`STREAM ${e}`);try{let l={t:`stream-open`,id:i,endpoint:e,payload:t};try{this.worker.postMessage(l),s=!0}catch(t){throw new m({kind:`carrier`,message:`web-preview tunnel: failed to open Remote stream ${e}`},{cause:t})}for(r!==void 0&&(o.pump=this.pumpUplink(i,r,n,a));;){let e=await a.next();if(n.throwIfAborted(),e.t===`stream-item`){yield e.value;continue}if(c=!0,e.t===`stream-error`)throw new m(e.failure);return}}finally{n.removeEventListener(`abort`,l),this.logicalStreams.delete(i),this.inFlight.delete(i),o.pump?.stop(),s&&!c&&this.abortWorkerOperation(i),o.pump!==void 0&&await o.pump.done}}pumpUplink(e,t,n,r){let i=Promise.withResolvers(),a=t[Symbol.asyncIterator](),o={active:!0,released:!1},s=()=>{o.released||(o.released=!0,Promise.resolve(a.return?.()).catch(()=>void 0))};return{done:this.forwardUplink(e,a,i.promise,()=>o.active&&!n.aborted).then(e=>{o.released||=e},e=>{r.fail(e)}).then(s),stop:()=>{o.active=!1,i.resolve({value:void 0,done:!0}),s()}}}async forwardUplink(e,t,n,r){for(;;){let i=await Promise.race([t.next(),n]);if(!r())return!1;if(i.done===!0)break;this.worker.postMessage({t:`stream-uplink-item`,id:e,value:i.value})}return this.worker.postMessage({t:`stream-uplink-end`,id:e}),!0}async bootPayload(){let e=await this.fetch(`/__boot__`);if(!e.ok)throw Error(`web-preview tunnel: boot payload failed with HTTP ${String(e.status)}: ${await e.text()}`);return await e.json()}async packageAssets(){let e=await this.fetch(`/__assets__`);if(!e.ok)throw Error(`web-preview tunnel: package assets failed with HTTP ${String(e.status)}: ${await e.text()}`);return d(new Uint8Array(await e.arrayBuffer()))}async loadBundle(e){let t=await this.fetch(e);if(!t.ok)throw Error(`web-preview tunnel: bundle ${e} failed with HTTP ${String(t.status)}`);let n=await b(await t.text(),e,this.fetch),r=URL.createObjectURL(new Blob([n],{type:`text/javascript`}));try{await new Promise((t,n)=>{let i=document.createElement(`script`);i.src=r,i.addEventListener(`load`,()=>{i.remove(),t()},{once:!0}),i.addEventListener(`error`,()=>{i.remove(),n(Error(`web-preview tunnel: bundle ${e} failed to execute`))},{once:!0}),document.head.append(i)})}finally{URL.revokeObjectURL(r)}}rejectOnAbort(e,t){let n=()=>{};return{rejected:new Promise((r,i)=>{let a=()=>{i(this.abortRequest(e))};if(t.aborted){a();return}t.addEventListener(`abort`,a,{once:!0}),n=()=>{t.removeEventListener(`abort`,a)}}),release:n}}abortRequest(e){this.unary.delete(e);let t=this.bodyStreams.get(e);this.bodyStreams.delete(e),this.inFlight.delete(e),this.releases.delete(e),this.abortWorkerOperation(e);let n=new DOMException(`The operation was aborted.`,`AbortError`);return t?.error(n),n}observeStreamAbort(e,t){let n=()=>{this.abortRequest(e)};t.addEventListener(`abort`,n,{once:!0}),this.releases.set(e,()=>{t.removeEventListener(`abort`,n)})}releaseSignal(e){let t=this.releases.get(e);this.releases.delete(e),t?.()}cancelStream(e){this.releaseSignal(e),this.bodyStreams.delete(e),this.inFlight.delete(e),this.abortWorkerOperation(e)}abortWorkerOperation(e){let t={t:`abort`,id:e};try{this.worker.postMessage(t)}catch{}}warnRefusal(e,t){console.warn(`web-preview tunnel: request ${String(e)} ${this.inFlight.get(e)??`(unknown request)`} → ${t}`)}receive(e){switch(e.t){case`res`:{let t=this.unary.get(e.id);if(t===void 0)return;e.status>=g&&this.warnRefusal(e.id,`HTTP ${String(e.status)}${e.message===void 0?``:`: ${e.message}`}`),this.unary.delete(e.id),this.inFlight.delete(e.id);let n=S.has(e.status)?null:e.body??e.message??null;t.resolve(new Response(n,{status:e.status,headers:e.headers}));return}case`res-head`:{let t=this.unary.get(e.id);if(t===void 0)return;this.unary.delete(e.id);let n=new ReadableStream({start:t=>{this.bodyStreams.set(e.id,t)},cancel:()=>{this.cancelStream(e.id)}});t.resolve(new Response(n,{status:e.status,headers:e.headers}));return}case`res-chunk`:this.bodyStreams.get(e.id)?.enqueue(new Uint8Array(e.chunk));return;case`res-end`:{let t=this.bodyStreams.get(e.id);if(t===void 0)return;this.bodyStreams.delete(e.id),this.inFlight.delete(e.id),this.releaseSignal(e.id),t.close();return}case`res-err`:{let t=Error(`web-preview tunnel: ${e.message}`);this.warnRefusal(e.id,`res-err: ${e.message}`);let n=this.unary.get(e.id);if(this.inFlight.delete(e.id),n!==void 0){this.unary.delete(e.id),n.reject(t);return}let r=this.bodyStreams.get(e.id);if(r===void 0)return;this.bodyStreams.delete(e.id),this.releaseSignal(e.id),r.error(t);return}case`view-text`:p(e.path,e.text);return;case`stream-item`:case`stream-end`:case`stream-error`:{let t=this.logicalStreams.get(e.id);if(t===void 0)return;t.inbox.push(e),e.t!==`stream-item`&&t.pump?.stop();return}default:throw Error(`web-preview tunnel: unknown frame ${JSON.stringify(e)}`)}}},w=`none`,T=`webfs`,E=`preview-fixture`,D=`
  [data-preview-source-chooser] {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: grid;
    place-items: center;
    overflow: auto;
    padding: 24px;
    box-sizing: border-box;
    color: #0f1115;
    background: #fff;
    font-size: 14px;
    line-height: 22px;
  }
  [data-preview-source-card] {
    width: min(600px, 100%);
    max-height: calc(100dvh - 48px);
    box-sizing: border-box;
    padding: 28px;
    overflow-y: auto;
    border: 1px solid transparent;
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 0 1px rgb(0 0 0 / 20%), 0 12px 32px rgb(0 0 0 / 8%);
  }
  [data-preview-source-card] h1 {
    margin: 0;
    font-size: 20px;
    line-height: 28px;
    font-weight: 500;
  }
  [data-preview-source-card] > p {
    margin: 8px 0 0;
    color: #61666b;
  }
  [data-preview-source-card] fieldset {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin: 24px 0 0;
    padding: 0;
    border: 0;
  }
  [data-preview-source-card] legend {
    margin: 0 0 8px;
    padding: 0 4px;
    color: #61666b;
    font-size: 13px;
    line-height: 20px;
    font-weight: 500;
  }
  [data-preview-source-option] {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-height: 56px;
    padding: 8px 12px 8px 8px;
    box-sizing: border-box;
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease;
  }
  [data-preview-source-option]:hover:not(:has(input:disabled)),
  [data-preview-source-option]:has(input:checked) {
    background: rgb(38 49 72 / 6%);
  }
  [data-preview-source-option]:has(input:checked) {
    border-color: rgb(0 0 0 / 10%);
  }
  [data-preview-source-option]:has(input:disabled) {
    cursor: default;
    opacity: 0.4;
  }
  [data-preview-source-option] input {
    flex: none;
    width: 16px;
    height: 16px;
    margin: 4px 0 0;
    accent-color: #0f1115;
  }
  [data-preview-source-option] > span { flex: 1; min-width: 0; }
  [data-preview-source-option] strong {
    display: block;
    font-size: 14px;
    line-height: 24px;
    font-weight: 500;
  }
  [data-preview-source-option] strong + span {
    display: block;
    color: #81858c;
    font-size: 14px;
    line-height: 24px;
  }
  [data-preview-source-submit] {
    display: block;
    min-width: 120px;
    height: 36px;
    margin: 24px 0 0 auto;
    padding: 0 14px;
    border: 0;
    border-radius: 18px;
    color: #fff;
    background: #0f1115;
    font-size: 14px;
    line-height: 22px;
    cursor: pointer;
    transition: background-color 120ms ease;
  }
  [data-preview-source-submit]:hover:not(:disabled) {
    background: #43454a;
  }
  [data-preview-source-submit]:focus-visible {
    outline: 2px solid rgb(0 0 0 / 16%);
    outline-offset: 2px;
  }
  [data-preview-source-submit]:disabled { cursor: not-allowed; opacity: 0.5; }
  @media (prefers-color-scheme: dark) {
    [data-preview-source-chooser] {
      color: #f9fafb;
      background: #151517;
    }
    [data-preview-source-card] { border-color: rgb(255 255 255 / 6%); background: #2c2c2e; }
    [data-preview-source-card] > p, [data-preview-source-card] legend { color: #cfd3d6; }
    [data-preview-source-option] strong + span { color: #adb2b8; }
    [data-preview-source-option]:hover:not(:has(input:disabled)),
    [data-preview-source-option]:has(input:checked) { background: rgb(255 255 255 / 8%); }
    [data-preview-source-option]:has(input:checked) { border-color: rgb(255 255 255 / 12%); }
    [data-preview-source-option] input { accent-color: #f9fafb; }
    [data-preview-source-submit] { color: #0f1115; background: #f9fafb; }
    [data-preview-source-submit]:hover:not(:disabled) { background: #ebeef2; }
    [data-preview-source-submit]:focus-visible { outline-color: rgb(255 255 255 / 20%); }
  }
  @media (max-width: 560px) {
    [data-preview-source-card] { padding: 24px; }
    [data-preview-source-submit] { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-preview-source-option], [data-preview-source-submit] { transition: none; }
  }
`,O={"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`};function k(e){return e.replace(/[&<>"']/g,e=>O[e]??e)}function A(e,t){return`<label data-preview-source-option>
    <input type="radio" name="preview-source" value="${e.id}"${e.id===t?` checked`:``}${e.disabled===!0?` disabled`:``}>
    <span>
      <strong>${k(e.label)}</strong>
      <span>${k(e.description)}</span>
    </span>
  </label>`}function j(e,t){return e.map(e=>({id:e.id,label:e.label,description:e.description,overlays:e.overlays.map(e=>new URL(e,t))}))}async function M(e){let t=new URL(location.href).searchParams.get(E);if(t===w)return[];let n=await fetch(e);if(!n.ok)throw Error(`preview source chooser: fixture manifest returned ${String(n.status)}`);let r=a(await n.json()),i=[{id:w,label:`Empty environment`,description:`Load only the base runtime to verify first launch and workspace creation.`,overlays:[]},...j(r.fixtures,e),{id:T,label:`WebFS directory`,description:`Requires directory access and will be available after the WebFS provider lands.`,overlays:[],disabled:!0}];if(t!==null){let e=i.find(e=>e.id===t&&e.disabled!==!0);if(e===void 0)throw Error(`preview source chooser: unknown or interactive source "${t}"`);return e.overlays}let o=document.getElementById(`root`);if(o===null)throw Error(`preview source chooser: missing #root`);let s=r.defaultFixture??w,c=document.createElement(`style`);c.dataset.previewSourceStyle=``,c.textContent=D,document.head.append(c);let l=document.createElement(`main`);l.dataset.previewSourceChooser=``,l.innerHTML=`<form data-preview-source-card aria-labelledby="preview-source-title">
      <h1 id="preview-source-title">Choose Preview data</h1>
      <p>Data mounts before the Worker and application start. Refresh to choose again.</p>
      <fieldset>
        <legend>Filesystem source</legend>
        ${i.map(e=>A(e,s)).join(``)}
      </fieldset>
      <button data-preview-source-submit type="submit">Start Preview</button>
    </form>`,o.prepend(l);let u=l.querySelector(`[data-preview-source-card]`);if(u===null)throw Error(`preview source chooser: form was not rendered`);let d=await new Promise((e,t)=>{u.addEventListener(`submit`,n=>{n.preventDefault();let r=new FormData(u).get(`preview-source`);typeof r==`string`?e(r):t(Error(`preview source chooser: no source selected`))},{once:!0})}),f=i.find(e=>e.id===d&&e.disabled!==!0);if(f===void 0)throw Error(`preview source chooser: unavailable source "${d}"`);return l.remove(),c.remove(),f.overlays}function N(){return globalThis.__DSH_BOOT_READY__??=Promise.withResolvers()}function P(){N().promise.catch(()=>{})}async function F(e={}){P();let t=new URL(e.image??`vfs-image.tar.gz`,document.baseURI),n=new URL(e.fixtureManifest??`fixtures.json`,t);try{return{overlays:await M(n)}}catch(e){throw N().reject(e),e}}async function I(e,t){let r=N();r.promise.catch(()=>{});try{let i=new C(e);i.init(new URL(t?.image??`vfs-image.tar.gz`,document.baseURI).href,(t?.overlays??[]).map(e=>new URL(e,document.baseURI).href));let[a,o]=await Promise.all([i.bootPayload(),i.packageAssets()]);return globalThis.__DSH_TRANSPORT__={fetch:(e,t)=>i.fetch(e,t),openStream:(e,t,n,r)=>i.open(e,t,n,r),loadBundle:e=>i.loadBundle(e),resolveAsset:o,ownsHost:!0},globalThis.__DSH_FILE_UPLOAD__={fetch:(e,t)=>i.fetch(e,t)},await n(a.injections,e=>i.loadBundle(e)),r.resolve(),{worker:e,tunnel:i,loadBundle:e=>i.loadBundle(e)}}catch(e){throw r.reject(e),e}}var L=`preview/${r}`,R=await F({image:L});await I(new e({name:`dsh-host`}),{image:L,overlays:R.overlays});
//# sourceMappingURL=bootstrap-C5dPrzJD.js.map