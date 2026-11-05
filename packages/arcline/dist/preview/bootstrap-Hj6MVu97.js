function R(e){return new Worker(""+new URL("worker-DjuD-Ymq.js",import.meta.url).href,{name:e?.name})}function L(e){throw new Error(`web boot: unknown index injection row ${JSON.stringify(e)}`)}async function $(e,t){for(const r of e)switch(r.kind){case"global":globalThis[r.name]=r.value;break;case"script":{const o=document.createElement("script");o.textContent=r.text,(r.placement==="head"?document.head:document.body).append(o);break}case"script-src":await t(r.src);break;case"script-preload":break;case"style":{const o=document.createElement("style");o.textContent=r.text,document.head.append(o);break}case"html":(r.placement==="head"?document.head:document.body).insertAdjacentHTML("beforeend",r.html);break;default:L(r)}}const T="vfs-image.tar.gz";function y(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)?e:void 0}function A(e){const t=y(e);if(t?.version!==1||!Array.isArray(t.fixtures))throw new Error(`preview fixture manifest must use version ${String(1)}`);const r=[],o=new Set;for(const i of t.fixtures){const n=y(i),a=n?.id,c=n?.label,d=n?.description,p=n?.overlays,l=Array.isArray(p)?p.filter(u=>typeof u=="string"&&u.length>0):[];if(typeof a!="string"||!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(a)||a==="none"||a==="webfs"||typeof c!="string"||c.length===0||typeof d!="string"||d.length===0||!Array.isArray(p)||p.length===0||l.length!==p.length)throw new Error("preview fixture manifest contains an invalid fixture entry");if(o.has(a))throw new Error(`preview fixture manifest repeats id "${a}"`);o.add(a),r.push({id:a,label:c,description:d,overlays:l})}const s=t.defaultFixture;if(s!==null&&(typeof s!="string"||!o.has(s)))throw new Error("preview fixture manifest defaultFixture does not name a fixture");return{version:1,defaultFixture:s,fixtures:r}}new TextEncoder;const U=new TextDecoder,h=512;function f(e,t,r){let o=t;for(;o<t+r&&e[o]!==0;)o+=1;return U.decode(e.subarray(t,o))}function _(e){const t=[];let r=0;for(;r+h<=e.length;){const o=e.subarray(r,r+h);if(o.every(u=>u===0))break;const s=f(o,0,100),i=f(o,345,155),n=i===""?s:`${i}/${s}`,a=Number.parseInt(f(o,124,12).trim()||"0",8),c=Number.parseInt(f(o,100,8).trim()||"0",8)&511,d=o[156],p=d===53||n.endsWith("/");if(d!==48&&d!==0&&d!==53)throw new Error(`vfs tar: unsupported entry type ${String.fromCharCode(d??0)} for "${n}"`);const l=r+h;t.push({name:n,bytes:e.subarray(l,l+a),directory:p,mode:c}),r=l+Math.ceil(a/h)*h}return t}const M=new Map([[".svg","image/svg+xml"],[".png","image/png"],[".webp","image/webp"],[".jpg","image/jpeg"],[".jpeg","image/jpeg"]]);function j(e){const t=new Map;for(const r of _(e)){const[,o,s]=/^plugins\/((?:@[^/]+\/)?[^/]+)\/assets\/(.+)$/u.exec(r.name)??[];if(o===void 0||s===void 0)continue;const i=`plugins/${o}/assets/${s.split("/").map(a=>encodeURIComponent(a).replace(/[!'()*]/gu,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join("/")}`,n=s.slice(s.lastIndexOf(".")).toLowerCase();t.set(i,URL.createObjectURL(new Blob([new Uint8Array(r.bytes)],{type:M.get(n)??""})))}return r=>t.get(r)??r}const F=`
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
`;function O(e,t){let r=document.querySelector("dialog[data-preview-text-viewer]");if(r===null){const s=document.createElement("style");s.textContent=F,document.head.append(s),r=document.createElement("dialog"),r.dataset.previewTextViewer="";const i=document.createElement("header"),n=document.createElement("h2"),a=document.createElement("button");a.type="button",a.textContent="Close";const c=r;a.addEventListener("click",()=>{c.close()}),r.addEventListener("keydown",d=>{d.stopPropagation()}),i.append(n,a),r.append(i,document.createElement("pre")),document.body.append(r)}const o=r.querySelector("h2");o.textContent=e,o.title=e,r.querySelector("pre").textContent=t,r.open||r.showModal()}var g=class extends Error{dshRemoteStreamFailure;constructor(e,t){super(e.message,t),this.name="TunnelLogicalStreamError",this.dshRemoteStreamFailure=e.kind==="remote"?{kind:"remote",code:e.code,details:e.details}:{kind:"carrier"}}},P=class{frames=[];wake;failed=!1;failure;push(e){this.failed||(this.frames.push(e),this.wake?.(),this.wake=void 0)}fail(e){this.failed||(this.failed=!0,this.failure=e,this.frames.length=0,this.wake?.(),this.wake=void 0)}async next(){for(;this.frames.length===0;){if(this.failed)throw this.failure;await new Promise(e=>{this.wake=e})}return this.frames.shift()}};const I=500,C=new TextEncoder,b=/\/\/# sourceMappingURL=([^\r\n]+)\s*$/;function B(e){const t=new FileReader;return new Promise((r,o)=>{t.addEventListener("load",()=>{r(t.result)},{once:!0}),t.addEventListener("error",()=>{o(t.error??new Error("source map encoding failed"))},{once:!0}),t.readAsDataURL(new Blob([e],{type:"application/json;charset=utf-8"}))})}async function z(e,t,r){const o=b.exec(e);if(o?.[1]===void 0)return e;try{const s=await r(new URL(o[1],new URL(t,globalThis.location.origin)));if(!s.ok)return e.replace(b,"");const i=await B(await s.arrayBuffer());return e.replace(b,`//# sourceMappingURL=${i}`)}catch{return e.replace(b,"")}}function W(e){if(e!=null){if(typeof e=="string")return C.encode(e).buffer;if(e instanceof Blob||e instanceof ReadableStream||e instanceof ArrayBuffer)return e;if(ArrayBuffer.isView(e))return e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength);throw new Error(`web-preview tunnel: unsupported request body ${Object.prototype.toString.call(e)}`)}}const q=new Set([101,204,205,304]);var D=class{worker;nextId=1;unary=new Map;bodyStreams=new Map;logicalStreams=new Map;inFlight=new Map;releases=new Map;constructor(e){this.worker=e,e.addEventListener("message",t=>{this.receive(t.data)}),e.addEventListener("error",t=>{const r=new Error(`web-preview tunnel: worker failed: ${t.message}`);for(const s of this.inFlight.keys())this.warnRefusal(s,`worker failed: ${t.message}`);this.inFlight.clear();for(const s of this.unary.values())s.reject(r);this.unary.clear();for(const s of this.bodyStreams.values())s.error(r);this.bodyStreams.clear();const o=new g({kind:"carrier",message:`web-preview tunnel: worker failed: ${t.message}`},{cause:r});for(const{inbox:s}of this.logicalStreams.values())s.fail(o);this.logicalStreams.clear();for(const s of this.releases.values())s();this.releases.clear()})}init(e,t=[]){this.worker.postMessage({t:"init",image:e,overlays:t})}fetch=async(e,t)=>{const r=t?.signal;if(r?.aborted===!0)throw new DOMException("The operation was aborted.","AbortError");const o=this.nextId++,s=t?.body===void 0||t.body===null?void 0:W(t.body),i={t:"req",id:o,method:t?.method??"GET",url:new URL(e,globalThis.location.origin).toString(),headers:Object.fromEntries(new Headers(t?.headers).entries()),...s===void 0?{}:{body:s}},n=new Promise((c,d)=>{this.unary.set(o,{resolve:c,reject:d})});if(this.inFlight.set(o,`${i.method} ${i.url}`),s instanceof ReadableStream?this.worker.postMessage(i,[s]):this.worker.postMessage(i),r==null)return await n;const a=this.rejectOnAbort(o,r);try{const c=await Promise.race([n,a.rejected]);return this.bodyStreams.has(o)&&this.observeStreamAbort(o,r),c}finally{a.release()}};async*open(e,t,r,o){r.throwIfAborted();const s=this.nextId++,i=new P,n={inbox:i,pump:void 0};let a=!1,c=!1;const d=()=>{i.fail(r.reason)};r.addEventListener("abort",d,{once:!0}),this.logicalStreams.set(s,n),this.inFlight.set(s,`STREAM ${e}`);try{const p={t:"stream-open",id:s,endpoint:e,payload:t};try{this.worker.postMessage(p),a=!0}catch(l){throw new g({kind:"carrier",message:`web-preview tunnel: failed to open Remote stream ${e}`},{cause:l})}for(o!==void 0&&(n.pump=this.pumpUplink(s,o,r,i));;){const l=await i.next();if(r.throwIfAborted(),l.t==="stream-item"){yield l.value;continue}if(c=!0,l.t==="stream-error")throw new g(l.failure);return}}finally{r.removeEventListener("abort",d),this.logicalStreams.delete(s),this.inFlight.delete(s),n.pump?.stop(),a&&!c&&this.abortWorkerOperation(s),n.pump!==void 0&&await n.pump.done}}pumpUplink(e,t,r,o){const s=Promise.withResolvers(),i=t[Symbol.asyncIterator](),n={active:!0,released:!1},a=()=>{n.released||(n.released=!0,Promise.resolve(i.return?.()).catch(()=>{}))};return{done:this.forwardUplink(e,i,s.promise,()=>n.active&&!r.aborted).then(c=>{n.released||=c},c=>{o.fail(c)}).then(a),stop:()=>{n.active=!1,s.resolve({value:void 0,done:!0}),a()}}}async forwardUplink(e,t,r,o){for(;;){const s=await Promise.race([t.next(),r]);if(!o())return!1;if(s.done===!0)break;this.worker.postMessage({t:"stream-uplink-item",id:e,value:s.value})}return this.worker.postMessage({t:"stream-uplink-end",id:e}),!0}async bootPayload(){const e=await this.fetch("/__boot__");if(!e.ok)throw new Error(`web-preview tunnel: boot payload failed with HTTP ${String(e.status)}: ${await e.text()}`);return await e.json()}async packageAssets(){const e=await this.fetch("/__assets__");if(!e.ok)throw new Error(`web-preview tunnel: package assets failed with HTTP ${String(e.status)}: ${await e.text()}`);return j(new Uint8Array(await e.arrayBuffer()))}async loadBundle(e){const t=await this.fetch(e);if(!t.ok)throw new Error(`web-preview tunnel: bundle ${e} failed with HTTP ${String(t.status)}`);const r=await z(await t.text(),e,this.fetch),o=URL.createObjectURL(new Blob([r],{type:"text/javascript"}));try{await new Promise((s,i)=>{const n=document.createElement("script");n.src=o,n.addEventListener("load",()=>{n.remove(),s()},{once:!0}),n.addEventListener("error",()=>{n.remove(),i(new Error(`web-preview tunnel: bundle ${e} failed to execute`))},{once:!0}),document.head.append(n)})}finally{URL.revokeObjectURL(o)}}rejectOnAbort(e,t){let r=()=>{};return{rejected:new Promise((o,s)=>{const i=()=>{s(this.abortRequest(e))};if(t.aborted){i();return}t.addEventListener("abort",i,{once:!0}),r=()=>{t.removeEventListener("abort",i)}}),release:r}}abortRequest(e){this.unary.delete(e);const t=this.bodyStreams.get(e);this.bodyStreams.delete(e),this.inFlight.delete(e),this.releases.delete(e),this.abortWorkerOperation(e);const r=new DOMException("The operation was aborted.","AbortError");return t?.error(r),r}observeStreamAbort(e,t){const r=()=>{this.abortRequest(e)};t.addEventListener("abort",r,{once:!0}),this.releases.set(e,()=>{t.removeEventListener("abort",r)})}releaseSignal(e){const t=this.releases.get(e);this.releases.delete(e),t?.()}cancelStream(e){this.releaseSignal(e),this.bodyStreams.delete(e),this.inFlight.delete(e),this.abortWorkerOperation(e)}abortWorkerOperation(e){const t={t:"abort",id:e};try{this.worker.postMessage(t)}catch{}}warnRefusal(e,t){console.warn(`web-preview tunnel: request ${String(e)} ${this.inFlight.get(e)??"(unknown request)"} → ${t}`)}receive(e){switch(e.t){case"res":{const t=this.unary.get(e.id);if(t===void 0)return;e.status>=I&&this.warnRefusal(e.id,`HTTP ${String(e.status)}${e.message===void 0?"":`: ${e.message}`}`),this.unary.delete(e.id),this.inFlight.delete(e.id);const r=q.has(e.status)?null:e.body??e.message??null;t.resolve(new Response(r,{status:e.status,headers:e.headers}));return}case"res-head":{const t=this.unary.get(e.id);if(t===void 0)return;this.unary.delete(e.id);const r=new ReadableStream({start:o=>{this.bodyStreams.set(e.id,o)},cancel:()=>{this.cancelStream(e.id)}});t.resolve(new Response(r,{status:e.status,headers:e.headers}));return}case"res-chunk":this.bodyStreams.get(e.id)?.enqueue(new Uint8Array(e.chunk));return;case"res-end":{const t=this.bodyStreams.get(e.id);if(t===void 0)return;this.bodyStreams.delete(e.id),this.inFlight.delete(e.id),this.releaseSignal(e.id),t.close();return}case"res-err":{const t=new Error(`web-preview tunnel: ${e.message}`);this.warnRefusal(e.id,`res-err: ${e.message}`);const r=this.unary.get(e.id);if(this.inFlight.delete(e.id),r!==void 0){this.unary.delete(e.id),r.reject(t);return}const o=this.bodyStreams.get(e.id);if(o===void 0)return;this.bodyStreams.delete(e.id),this.releaseSignal(e.id),o.error(t);return}case"view-text":O(e.path,e.text);return;case"stream-item":case"stream-end":case"stream-error":{const t=this.logicalStreams.get(e.id);if(t===void 0)return;t.inbox.push(e),e.t!=="stream-item"&&t.pump?.stop();return}default:throw new Error(`web-preview tunnel: unknown frame ${JSON.stringify(e)}`)}}};const m="none",H="webfs",N="preview-fixture",Y=`
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
`,V={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function k(e){return e.replace(/[&<>"']/g,t=>V[t]??t)}function G(e,t){return`<label data-preview-source-option>
    <input type="radio" name="preview-source" value="${e.id}"${e.id===t?" checked":""}${e.disabled===!0?" disabled":""}>
    <span>
      <strong>${k(e.label)}</strong>
      <span>${k(e.description)}</span>
    </span>
  </label>`}function J(e,t){return e.map(r=>({id:r.id,label:r.label,description:r.description,overlays:r.overlays.map(o=>new URL(o,t))}))}async function K(e){const t=new URL(location.href).searchParams.get(N);if(t===m)return[];const r=await fetch(e);if(!r.ok)throw new Error(`preview source chooser: fixture manifest returned ${String(r.status)}`);const o=A(await r.json()),s=[{id:m,label:"Empty environment",description:"Load only the base runtime to verify first launch and workspace creation.",overlays:[]},...J(o.fixtures,e),{id:H,label:"WebFS directory",description:"Requires directory access and will be available after the WebFS provider lands.",overlays:[],disabled:!0}];if(t!==null){const u=s.find(w=>w.id===t&&w.disabled!==!0);if(u===void 0)throw new Error(`preview source chooser: unknown or interactive source "${t}"`);return u.overlays}const i=document.getElementById("root");if(i===null)throw new Error("preview source chooser: missing #root");const n=o.defaultFixture??m,a=document.createElement("style");a.dataset.previewSourceStyle="",a.textContent=Y,document.head.append(a);const c=document.createElement("main");c.dataset.previewSourceChooser="",c.innerHTML=`<form data-preview-source-card aria-labelledby="preview-source-title">
      <h1 id="preview-source-title">Choose Preview data</h1>
      <p>Data mounts before the Worker and application start. Refresh to choose again.</p>
      <fieldset>
        <legend>Filesystem source</legend>
        ${s.map(u=>G(u,n)).join("")}
      </fieldset>
      <button data-preview-source-submit type="submit">Start Preview</button>
    </form>`,i.prepend(c);const d=c.querySelector("[data-preview-source-card]");if(d===null)throw new Error("preview source chooser: form was not rendered");const p=await new Promise((u,w)=>{d.addEventListener("submit",E=>{E.preventDefault();const x=new FormData(d).get("preview-source");typeof x=="string"?u(x):w(new Error("preview source chooser: no source selected"))},{once:!0})}),l=s.find(u=>u.id===p&&u.disabled!==!0);if(l===void 0)throw new Error(`preview source chooser: unavailable source "${p}"`);return c.remove(),a.remove(),l.overlays}function v(){return globalThis.__DSH_BOOT_READY__??=Promise.withResolvers()}function Q(){v().promise.catch(()=>{})}async function X(e={}){Q();const t=new URL(e.image??"vfs-image.tar.gz",document.baseURI),r=new URL(e.fixtureManifest??"fixtures.json",t);try{return{overlays:await K(r)}}catch(o){throw v().reject(o),o}}async function Z(e,t){const r=v();r.promise.catch(()=>{});try{const o=new D(e);o.init(new URL(t?.image??"vfs-image.tar.gz",document.baseURI).href,(t?.overlays??[]).map(n=>new URL(n,document.baseURI).href));const[s,i]=await Promise.all([o.bootPayload(),o.packageAssets()]);return globalThis.__DSH_TRANSPORT__={fetch:(n,a)=>o.fetch(n,a),openStream:(n,a,c,d)=>o.open(n,a,c,d),loadBundle:n=>o.loadBundle(n),resolveAsset:i,ownsHost:!0},globalThis.__DSH_FILE_UPLOAD__={fetch:(n,a)=>o.fetch(n,a)},await $(s.injections,n=>o.loadBundle(n)),r.resolve(),{worker:e,tunnel:o,loadBundle:n=>o.loadBundle(n)}}catch(o){throw r.reject(o),o}}const S=`preview/${T}`,ee=await X({image:S});await Z(new R({name:"dsh-host"}),{image:S,overlays:ee.overlays});
//# sourceMappingURL=bootstrap-Hj6MVu97.js.map
