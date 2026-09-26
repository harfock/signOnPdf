import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
const $=id=>document.getElementById(id);
const pdfInput=$("pdfInput"),uploadBtn=$("uploadBtn"),welcomeUpload=$("welcomeUpload"),welcome=$("welcome"),editor=$("editor"),pdfContainer=$("pdfContainer"),pdfArea=$("pdfArea");
const prevPage=$("prevPage"),nextPage=$("nextPage"),pageInfo=$("pageInfo"),zoomOut=$("zoomOut"),zoomIn=$("zoomIn"),fitPage=$("fitPage"),zoomInfo=$("zoomInfo"),addText=$("addText"),addName=$("addName"),addDate=$("addDate"),addSignature=$("addSignature"),undoBtn=$("undo"),deleteSelected=$("deleteSelected"),exportPdf=$("exportPdf");
const exportResult=$("exportResult"),exportPreview=$("exportPreview"),exportFileName=$("exportFileName"),savePdf=$("savePdf"),openPdfTab=$("openPdfTab"),closeExportResult=$("closeExportResult");
const textDialog=$("textDialog"),textInput=$("textInput"),textDialogTitle=$("textDialogTitle"),textCancel=$("textCancel"),textConfirm=$("textConfirm");
const signatureDialog=$("signatureDialog"),signatureCanvas=$("signatureCanvas"),signatureClear=$("signatureClear"),signatureCancel=$("signatureCancel"),signatureConfirm=$("signatureConfirm"),savedSignatures=$("savedSignatures");
let pdfDocument=null,currentPage=1,zoom=1,renderVersion=0,sourcePdfBytes=null,sourceFileName="document",selectedId=null,pendingTextType="text",history=[],annotations=new Map(),editingId=null;
const SUPPORTED=new Set(["pdf","jpg","jpeg","png","webp","heic","heif"]);
const ext=n=>{const p=n.toLowerCase().split(".");return p.length>1?p.pop():""};
const supported=f=>SUPPORTED.has(ext(f.name));
function snapshot(){return JSON.stringify([...annotations.entries()])}
function restore(s){annotations=new Map(JSON.parse(s));selectedId=null}
function commit(){history.push(snapshot());if(history.length>50)history.shift()}
function currentList(){return annotations.get(currentPage)||[]}
function setCurrentList(list){annotations.set(currentPage,list)}
function newId(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`}
function openPicker(){pdfInput.value="";pdfInput.click()}
uploadBtn.onclick=openPicker;welcomeUpload.onclick=openPicker;
pdfInput.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{await openDocument(f)}catch(err){console.error(err);alert("This file could not be opened. Please check that it is a valid PDF or supported image.")}};
async function openDocument(file){
if(!supported(file))throw Error("Unsupported format");
const isPdf=ext(file.name)==="pdf";
let bytes=isPdf?new Uint8Array(await file.arrayBuffer()):await imageFileToPdf(file);
// Keep two completely independent byte arrays. PDF.js can transfer/detach its input buffer;
// pdf-lib must always receive a pristine PDF byte array for export.
const exportBytes=Uint8Array.from(bytes);
const viewerBytes=Uint8Array.from(bytes);
if(exportBytes.length<5||String.fromCharCode(...exportBytes.slice(0,5))!=="%PDF-")throw Error("The uploaded document could not be converted into a valid PDF.");
const doc=await pdfjsLib.getDocument({data:viewerBytes}).promise;
sourcePdfBytes=Uint8Array.from(exportBytes);
sourceFileName=file.name.replace(/\.[^.]+$/i,"")||"document";pdfDocument=doc;currentPage=1;zoom=1;annotations=new Map();history=[];selectedId=null;welcome.classList.add("hidden");editor.classList.remove("hidden");await renderPage();await fitCurrentPageToWidth()}
async function imageFileToPdf(file){const L=window.PDFLib;if(!L?.PDFDocument)throw Error("pdf-lib unavailable");let blob=file,e=ext(file.name);if(e==="heic"||e==="heif"){if(typeof window.heic2any!=="function")throw Error("HEIC decoder unavailable");blob=await window.heic2any({blob:file,toType:"image/png"});if(Array.isArray(blob))blob=blob[0]}const url=URL.createObjectURL(blob);try{const img=await loadImage(url),w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,max=3000,s=Math.min(1,max/Math.max(w,h)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*s));c.height=Math.max(1,Math.round(h*s));const ctx=c.getContext("2d",{alpha:false});if(!ctx)throw Error("Image canvas unavailable");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);const b=await new Promise((res,rej)=>c.toBlob(x=>x?res(x):rej(Error("PNG conversion failed")),"image/png"));const p=await L.PDFDocument.create(),im=await p.embedPng(new Uint8Array(await b.arrayBuffer())),page=p.addPage([c.width,c.height]);page.drawImage(im,{x:0,y:0,width:c.width,height:c.height});const result=new Uint8Array(await p.save());if(result.length<5||String.fromCharCode(...result.slice(0,5))!=="%PDF-")throw Error("Image conversion did not produce a valid PDF");return result}finally{URL.revokeObjectURL(url)}}
function loadImage(url){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error("Image decode failed"));i.src=url})}
function today(){const d=new Date();return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`}
function newAnnotationPosition(w,h){const wrapper=pdfContainer.querySelector(".pdf-page-wrapper");const pageW=wrapper?wrapper.clientWidth/zoom:600;const pageH=wrapper?wrapper.clientHeight/zoom:800;return{x:Math.max(0,(pageW-w)/2),y:Math.max(0,(pageH-h)/2)}}
function addTextLike(type,value){commit();const list=currentList();const w=type==="name"?170:150,h=34,pos=newAnnotationPosition(w,h);list.push({id:newId(),type,text:value,x:pos.x,y:pos.y,w,h,fontSize:18});setCurrentList(list);selectedId=list.at(-1).id;renderPage()}
function showTextDialog(type,id=null){pendingTextType=type;editingId=id;textDialogTitle.textContent=id?(type==="name"?"Edit name":"Edit text"):(type==="name"?"Add name":"Add text");const a=id?currentList().find(x=>x.id===id):null;textInput.value=a?.text||"";textConfirm.textContent=id?"Save":"Add";textDialog.classList.remove("hidden");setTimeout(()=>{textInput.focus();textInput.select()},50)}
addText.onclick=()=>showTextDialog("text");addName.onclick=()=>showTextDialog("name");
addDate.onclick=()=>{commit();const l=currentList(),w=130,h=34,pos=newAnnotationPosition(w,h);l.push({id:newId(),type:"date",text:today(),x:pos.x,y:pos.y,w,h,fontSize:18});setCurrentList(l);selectedId=l.at(-1).id;renderPage()};
textCancel.onclick=()=>{textDialog.classList.add("hidden");editingId=null};
textConfirm.onclick=()=>{const v=textInput.value.trim();if(!v)return;if(editingId){const a=currentList().find(x=>x.id===editingId);if(a){commit();a.text=v;renderPage()}}else addTextLike(pendingTextType,v);textDialog.classList.add("hidden");editingId=null};
textInput.onkeydown=e=>{if(e.key==="Enter")textConfirm.click();if(e.key==="Escape")textCancel.click()};
let drawing=false,signatureHasInk=false,sigCtx=signatureCanvas.getContext("2d");
function resizeSig(){const r=signatureCanvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);signatureCanvas.width=Math.max(1,Math.round(r.width*d));signatureCanvas.height=Math.max(1,Math.round(r.height*d));sigCtx.setTransform(d,0,0,d,0,0);sigCtx.lineWidth=2.4;sigCtx.lineCap="round";sigCtx.lineJoin="round";sigCtx.strokeStyle="#111827";signatureHasInk=false}
function sigPoint(e){const r=signatureCanvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function beginSig(e){drawing=true;signatureHasInk=true;const p=sigPoint(e);sigCtx.beginPath();sigCtx.moveTo(p.x,p.y);signatureCanvas.setPointerCapture?.(e.pointerId);e.preventDefault()}
function moveSig(e){if(!drawing)return;const p=sigPoint(e);sigCtx.lineTo(p.x,p.y);sigCtx.stroke();e.preventDefault()}
function endSig(){drawing=false}
signatureCanvas.addEventListener("pointerdown",beginSig);signatureCanvas.addEventListener("pointermove",moveSig);signatureCanvas.addEventListener("pointerup",endSig);signatureCanvas.addEventListener("pointercancel",endSig);
function getSavedSignatures(){try{return JSON.parse(localStorage.getItem("pdfSignerSignatures")||"[]")}catch{return[]}}
function saveSignature(data){const list=getSavedSignatures().filter(x=>x!==data);list.unshift(data);localStorage.setItem("pdfSignerSignatures",JSON.stringify(list.slice(0,10)))}
function renderSavedSignatures(){const list=getSavedSignatures();savedSignatures.innerHTML="";if(!list.length){savedSignatures.innerHTML='<div class="empty-signatures">No saved signatures yet.</div>';return}const title=document.createElement("div");title.className="signature-label";title.textContent="Saved signatures — tap to reuse";savedSignatures.appendChild(title);const grid=document.createElement("div");grid.className="signature-grid";list.forEach(data=>{const b=document.createElement("button");b.className="saved-signature";const img=document.createElement("img");img.src=data;b.appendChild(img);b.onclick=()=>useSignature(data);grid.appendChild(b)});savedSignatures.appendChild(grid)}
function clearSig(){resizeSig()}
function useSignature(data){commit();const l=currentList(),w=180,h=70,pos=newAnnotationPosition(w,h);l.push({id:newId(),type:"signature",data,x:pos.x,y:pos.y,w,h,fontSize:0});setCurrentList(l);selectedId=l.at(-1).id;signatureDialog.classList.add("hidden");renderPage()}
addSignature.onclick=()=>{signatureDialog.classList.remove("hidden");renderSavedSignatures();setTimeout(()=>{resizeSig()},30)};
signatureClear.onclick=clearSig;signatureCancel.onclick=()=>signatureDialog.classList.add("hidden");
signatureConfirm.onclick=()=>{if(!signatureHasInk){alert("Please draw a signature first.");return}const data=signatureCanvas.toDataURL("image/png");saveSignature(data);useSignature(data)};
function select(id){selectedId=id;document.querySelectorAll(".annotation").forEach(e=>e.classList.toggle("selected",e.dataset.id===id));updateControls()}
function removeSelected(){if(!selectedId)return;const l=currentList(),i=l.findIndex(a=>a.id===selectedId);if(i<0)return;commit();l.splice(i,1);setCurrentList(l);selectedId=null;renderPage()}
deleteSelected.onclick=removeSelected;
function makeAnnotation(a,wrapper){const el=document.createElement("div");el.className=`annotation ${a.type}${a.id===selectedId?" selected":""}`;el.dataset.id=a.id;el.style.left=`${a.x*zoom}px`;el.style.top=`${a.y*zoom}px`;el.style.width=`${a.w*zoom}px`;el.style.height=`${a.h*zoom}px`;
if(a.type!=="signature"){el.textContent=a.text;el.style.fontSize=`${a.fontSize*zoom}px`;el.style.display="flex";el.style.alignItems="center"}else{const img=document.createElement("img");img.src=a.data;el.appendChild(img)}
const del=document.createElement("button");del.className="delete-handle";del.textContent="×";del.title="Delete";del.onclick=e=>{e.stopPropagation();select(a.id);removeSelected()};const handle=document.createElement("span");handle.className="resize-handle";el.append(del,handle);
let mode=null,sx=0,sy=0,ax=0,ay=0,aw=0,ah=0;el.addEventListener("dblclick",e=>{e.stopPropagation();if(a.type==="text"||a.type==="name")showTextDialog(a.type,a.id)});
el.addEventListener("pointerdown",e=>{if(e.target===del||e.target===handle)return;select(a.id);mode="move";sx=e.clientX;sy=e.clientY;ax=a.x;ay=a.y;try{el.setPointerCapture(e.pointerId)}catch{}e.preventDefault();e.stopPropagation()});
handle.addEventListener("pointerdown",e=>{select(a.id);mode="resize";sx=e.clientX;sy=e.clientY;aw=a.w;ah=a.h;try{handle.setPointerCapture(e.pointerId)}catch{}e.preventDefault();e.stopPropagation()});
el.addEventListener("pointermove",e=>{if(!mode)return;if(mode==="move"){a.x=Math.max(0,ax+(e.clientX-sx)/zoom);a.y=Math.max(0,ay+(e.clientY-sy)/zoom)}else{a.w=Math.max(45,aw+(e.clientX-sx)/zoom);a.h=Math.max(24,ah+(e.clientY-sy)/zoom)}el.style.left=`${a.x*zoom}px`;el.style.top=`${a.y*zoom}px`;el.style.width=`${a.w*zoom}px`;el.style.height=`${a.h*zoom}px`;if(a.type!=="signature")el.style.fontSize=`${a.fontSize*zoom}px`});
el.addEventListener("pointerup",()=>{if(mode){commit();mode=null}});el.addEventListener("pointercancel",()=>{if(mode){commit();mode=null}});wrapper.appendChild(el)}
async function renderPage(){if(!pdfDocument)return;const ver=++renderVersion,pn=currentPage,page=await pdfDocument.getPage(pn),vp=page.getViewport({scale:zoom}),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{alpha:false}),ds=Math.min(devicePixelRatio||1,2);canvas.className="pdf-page";canvas.width=Math.floor(vp.width*ds);canvas.height=Math.floor(vp.height*ds);canvas.style.width=`${vp.width}px`;canvas.style.height=`${vp.height}px`;await page.render({canvasContext:ctx,viewport:vp,transform:ds!==1?[ds,0,0,ds,0,0]:undefined}).promise;if(ver!==renderVersion||pn!==currentPage)return;const wrap=document.createElement("div");wrap.className="pdf-page-wrapper";wrap.style.width=`${vp.width}px`;wrap.style.height=`${vp.height}px`;wrap.appendChild(canvas);for(const a of currentList())makeAnnotation(a,wrap);pdfContainer.replaceChildren(wrap);updateControls()}
function updateControls(){pageInfo.textContent=`Page ${currentPage} / ${pdfDocument?.numPages||1}`;zoomInfo.textContent=`${Math.round(zoom*100)}%`;prevPage.disabled=!pdfDocument||currentPage<=1;nextPage.disabled=!pdfDocument||currentPage>=pdfDocument.numPages;undoBtn.disabled=!history.length;deleteSelected.disabled=!selectedId}
async function fitCurrentPageToWidth(){if(!pdfDocument)return;const p=await pdfDocument.getPage(currentPage),u=p.getViewport({scale:1}),available=Math.max(180,pdfArea.clientWidth-24),target=Math.min(available/u.width,3);zoom=Math.max(.25,Math.round(target*100)/100);await renderPage()}
prevPage.onclick=async()=>{if(currentPage>1){currentPage--;selectedId=null;await renderPage();await fitCurrentPageToWidth()}};nextPage.onclick=async()=>{if(pdfDocument&&currentPage<pdfDocument.numPages){currentPage++;selectedId=null;await renderPage();await fitCurrentPageToWidth()}};zoomOut.onclick=async()=>{if(pdfDocument){zoom=Math.max(.25,Math.round((zoom-.1)*10)/10);await renderPage()}};zoomIn.onclick=async()=>{if(pdfDocument){zoom=Math.min(3,Math.round((zoom+.1)*10)/10);await renderPage()}};fitPage.onclick=fitCurrentPageToWidth;undoBtn.onclick=async()=>{if(!history.length)return;restore(history.pop());await renderPage()};
function dataUrlBytes(data){const part=data.split(",")[1];if(!part)throw Error("Invalid image data");const b=atob(part);const a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
function textAnnotationDataUrl(text,fontSize,width,height){
  const scale=Math.min(Math.max(window.devicePixelRatio||2,2),3);
  const w=Math.max(1,Math.ceil(width*scale));
  const h=Math.max(1,Math.ceil(height*scale));
  const c=document.createElement("canvas"); c.width=w; c.height=h;
  const ctx=c.getContext("2d"); if(!ctx) throw Error("Text canvas unavailable");
  ctx.clearRect(0,0,w,h); ctx.scale(scale,scale);
  const family='-apple-system,BlinkMacSystemFont,"PingFang TC","PingFang SC","Noto Sans CJK TC","Noto Sans CJK SC","Microsoft JhengHei","Microsoft YaHei",Arial,sans-serif';
  let fs=Math.max(6,Math.min(96,fontSize));
  ctx.font=`${fs}px ${family}`;
  const maxW=Math.max(10,width-10);
  if(ctx.measureText(text).width>maxW){fs=Math.max(6,fs*maxW/ctx.measureText(text).width);ctx.font=`${fs}px ${family}`;}
  ctx.fillStyle="#111827"; ctx.textBaseline="middle"; ctx.textAlign="left";
  ctx.fillText(text,5, height/2);
  return c.toDataURL("image/png");
}
let exportedBlob=null,exportedUrl=null,exportedFilename="document.pdf";
function closeExportPreview(){
  exportResult.classList.add("hidden");
  if(exportPreview) exportPreview.innerHTML="";
  if(exportedUrl){URL.revokeObjectURL(exportedUrl);exportedUrl=null;}
  exportedBlob=null;
}

async function renderExportPreview(bytes){
  exportPreview.innerHTML="";
  const task=pdfjsLib.getDocument({data:Uint8Array.from(bytes)});
  const doc=await task.promise;
  const availableWidth=Math.max(280, exportPreview.clientWidth-36);
  for(let i=1;i<=doc.numPages;i++){
    const page=await doc.getPage(i);
    const base=page.getViewport({scale:1});
    const scale=Math.min(1.5, availableWidth/base.width);
    const viewport=page.getViewport({scale});
    const wrapper=document.createElement("div");
    wrapper.className="export-preview-page";
    wrapper.style.width=`${viewport.width}px`;
    wrapper.style.height=`${viewport.height}px`;
    const canvas=document.createElement("canvas");
    canvas.width=Math.ceil(viewport.width);
    canvas.height=Math.ceil(viewport.height);
    canvas.style.width=`${viewport.width}px`;
    canvas.style.height=`${viewport.height}px`;
    wrapper.appendChild(canvas);
    exportPreview.appendChild(wrapper);
    const ctx=canvas.getContext("2d",{alpha:false});
    await page.render({canvasContext:ctx,viewport}).promise;
  }
}
async function saveExportedPdf(){
  if(!exportedBlob)return;
  const link=document.createElement("a");
  link.href=exportedUrl;
  link.download=exportedFilename;
  link.rel="noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
async function shareExportedPdf(){
  if(!exportedBlob)return;
  if(!navigator.share){
    alert("Sharing is not supported by this browser. Use Save to Files instead.");
    return;
  }

  const file=new File([exportedBlob],exportedFilename,{
    type:"application/pdf",
    lastModified:Date.now()
  });

  try{
    // Android browsers can expose navigator.share() but still reject a
    // particular file. Test the exact PDF before opening the share sheet.
    if(navigator.canShare && !navigator.canShare({files:[file]})){
      alert("This browser cannot share PDF files directly. The PDF is ready; please use Save to Files, then share it from your Files/Downloads app.");
      return;
    }

    // For file sharing, keep the payload to the PDF itself. Some Android
    // share implementations are stricter when title/text are included.
    await navigator.share({files:[file]});
  }catch(e){
    if(e?.name==="AbortError") return;
    console.error("Share failed:",e);
    alert("Android could not open the PDF share sheet. Please use Save to Files, then share the saved PDF from Files/Downloads.");
  }
}
function openExportedInNewTab(){
  if(!exportedBlob)return;
  const popup=window.open("","_blank");
  if(!popup){
    alert("Please allow pop-ups for this site to open the PDF in a new tab.");
    return;
  }
  const viewerUrl=URL.createObjectURL(exportedBlob);
  const safeName=exportedFilename.replace(/[<>:"/\\|?*\x00-\x1F]/g,"_");
  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeName}</title><style>html,body{margin:0;height:100%;font-family:Arial,sans-serif;background:#525659;color:#fff}body{display:flex;flex-direction:column}.bar{height:52px;background:#fff;color:#222;display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;flex-shrink:0}.name{font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.btn{border:1px solid #ccc;background:#fff;border-radius:7px;padding:8px 14px;text-decoration:none;color:#222;font-size:14px}.pages{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;align-items:center;gap:18px;box-sizing:border-box}.page{background:#fff;box-shadow:0 3px 12px #0008;max-width:100%}.page canvas{display:block;max-width:100%;height:auto}</style></head><body><div class="bar"><div class="name">${safeName}</div><a class="btn" id="download" download="${safeName}" href="${viewerUrl}">Save PDF</a></div><div class="pages" id="pages"><div>Loading PDF…</div></div><script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs" type="module"><\/script><script type="module">const url=${JSON.stringify(viewerUrl)};const filename=${JSON.stringify(safeName)};const pages=document.getElementById('pages');const wait=()=>window.pdfjsLib?Promise.resolve():new Promise(r=>setTimeout(r,50));let n=0;while(!window.pdfjsLib&&n++<200)await wait();if(!window.pdfjsLib){pages.textContent='PDF viewer could not load. Use Save PDF.';}else{try{const doc=await window.pdfjsLib.getDocument(url).promise;pages.innerHTML='';for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const base=page.getViewport({scale:1});const scale=Math.min(1.5,(pages.clientWidth-36)/base.width);const vp=page.getViewport({scale});const wrap=document.createElement('div');wrap.className='page';const canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);canvas.style.width=vp.width+'px';canvas.style.height=vp.height+'px';wrap.appendChild(canvas);pages.appendChild(wrap);await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:vp}).promise;}}catch(e){pages.textContent='Unable to preview PDF. Use Save PDF.';}}</script></body></html>`);
  popup.document.close();
}
savePdf.onclick=saveExportedPdf;sharePdf.onclick=shareExportedPdf;openPdfTab.onclick=openExportedInNewTab;closeExportResult.onclick=closeExportPreview;
async function exportDocument(){
  if(!sourcePdfBytes){alert("Please upload a document first.");return}
  const L=window.PDFLib;if(!L?.PDFDocument){alert("PDF export library is unavailable. Please reload the page.");return}
  exportPdf.disabled=true;exportPdf.textContent="Exporting…";
  try{
    const out=await L.PDFDocument.load(Uint8Array.from(sourcePdfBytes));
    const pages=out.getPages();
    for(let i=0;i<pages.length;i++){
      const page=pages[i],pw=page.getWidth(),ph=page.getHeight();
      const viewerPage=await pdfDocument.getPage(i+1);const base=viewerPage.getViewport({scale:1});
      const scaleX=pw/base.width,scaleY=ph/base.height;
      for(const a of annotations.get(i+1)||[]){
        const x=Math.max(0,Math.min(a.x*scaleX,pw-a.w*scaleX));
        const top=Math.max(0,Math.min(a.y*scaleY,ph-a.h*scaleY));
        const w=a.w*scaleX,h=a.h*scaleY,y=ph-top-h;
        const data=a.type==="signature"?a.data:textAnnotationDataUrl(a.text,a.fontSize*scaleX,w,h);
        const img=await out.embedPng(dataUrlBytes(data));
        page.drawImage(img,{x,y,width:w,height:h});
      }
    }
    const bytes=await out.save();
    exportedBlob=new Blob([bytes],{type:"application/pdf"});
    exportedUrl=URL.createObjectURL(exportedBlob);
    const safeBase=(sourceFileName||"document").replace(/\.[^.]+$/i,"").trim()||"document";
    exportedFilename=`${safeBase.slice(0,8)}.pdf`;
    exportFileName.textContent=exportedFilename;
    exportResult.classList.remove("hidden");
    await renderExportPreview(bytes);
  }catch(e){console.error("PDF export failed:",e);alert(`The PDF could not be exported.\n\n${e?.message||e}`)}
  finally{exportPdf.disabled=false;exportPdf.textContent="Export PDF"}
}
exportPdf.onclick=exportDocument;
window.addEventListener("resize",()=>{if(signatureDialog&&!signatureDialog.classList.contains("hidden")){const had=signatureHasInk;const data=had?signatureCanvas.toDataURL("image/png"):null;resizeSig();if(data){const img=new Image();img.onload=()=>{sigCtx.drawImage(img,0,0,signatureCanvas.clientWidth,signatureCanvas.clientHeight);signatureHasInk=true};img.src=data}}});
updateControls();
