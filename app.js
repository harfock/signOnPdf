import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
const $=id=>document.getElementById(id);
const pdfInput=$("pdfInput"),uploadBtn=$("uploadBtn"),welcomeUpload=$("welcomeUpload"),welcome=$("welcome"),editor=$("editor"),pdfContainer=$("pdfContainer"),pdfArea=$("pdfArea");
const prevPage=$("prevPage"),nextPage=$("nextPage"),pageInfo=$("pageInfo"),zoomOut=$("zoomOut"),zoomIn=$("zoomIn"),fitPage=$("fitPage"),zoomInfo=$("zoomInfo"),addText=$("addText"),addName=$("addName"),addDate=$("addDate"),addSignature=$("addSignature"),undoBtn=$("undo"),deleteSelected=$("deleteSelected"),exportPdf=$("exportPdf");
const textProperties=$("textProperties"),fontSizeInput=$("fontSizeInput"),fontSizeDown=$("fontSizeDown"),fontSizeUp=$("fontSizeUp"),textColorInput=$("textColorInput");
const exportResult=$("exportResult"),exportPreview=$("exportPreview"),exportFileName=$("exportFileName"),savePdf=$("savePdf"),openPdfTab=$("openPdfTab"),closeExportResult=$("closeExportResult");
const textDialog=$("textDialog"),textInput=$("textInput"),textDialogTitle=$("textDialogTitle"),textCancel=$("textCancel"),textConfirm=$("textConfirm");
const signatureDialog=$("signatureDialog"),signatureCanvas=$("signatureCanvas"),signatureClear=$("signatureClear"),signatureCancel=$("signatureCancel"),signatureConfirm=$("signatureConfirm"),savedSignatures=$("savedSignatures"),signatureColorInput=$("signatureColorInput"),penStyleGroup=$("penStyleGroup");
let pdfDocument=null,currentPage=1,zoom=1,renderVersion=0,sourcePdfBytes=null,sourceFileName="document",selectedId=null,pendingTextType="text",history=[],annotations=new Map(),editingId=null;
const languageSelect=$("languageSelect"),readmeBtn=$("readmeBtn"),readmeModal=$("readmeModal"),readmeClose=$("readmeClose"),readmeContent=$("readmeContent");
const LANGS={
  en:{label:"English",welcomeTitle:"Sign your document",welcomeDescription:"Upload PDF, JPG, JPEG, PNG, WEBP, HEIC or HEIF. Images are converted to PDF automatically.",chooseFile:"Choose File",localNote:"All editing is performed locally in your browser.",uploadFile:"Upload File",fit:"Fit",text:"Text",name:"Name",date:"Date",signature:"Signature",undo:"Undo",delete:"Delete",exportPdf:"Export PDF",addText:"Add text",editText:"Edit text",addName:"Add name",editName:"Edit name",enterText:"Enter text",cancel:"Cancel",add:"Add",save:"Save",pdfReady:"PDF ready",saveToFiles:"Save to Files",share:"Share",openNewTab:"Open in New Tab",exportHelp:"Use <b>Save to Files</b> to save the PDF, or <b>Share</b> to open the system share sheet.",drawSignature:"Draw a new signature",clear:"Clear",saveUse:"Save & Use",penStyle:"Pen",penFine:"Fine",penBallpoint:"Ballpoint",penBold:"Bold",penMarker:"Marker",inkColor:"Ink",textSize:"Size",textColor:"Color",noSavedSignatures:"No saved signatures yet.",reuseSignature:"Saved signatures — tap to reuse",readme:"Read Me",readmeTitle:"PDF Signer — Read Me",readmeIntro:"PDF Signer lets you add text, names, dates and handwritten signatures to PDF and image documents. Your document is processed locally in your browser.",howTo:"How to use",steps:["Choose a PDF or supported image file.","Use Text, Name, Date or Signature to add an item to the current page.","Drag an item to move it. Drag its handle to resize it. Double-tap text or name to edit it.","Use Undo or Delete when needed.","Choose Export PDF, then Save to Files, Share, or Open in New Tab."],formats:"Supported formats",formatsText:"PDF, JPG, JPEG, PNG, WEBP, HEIC and HEIF.",privacy:"Privacy",privacyText:"Files and edits are processed locally in this browser. The app does not need to upload your document to a server.",creator:"Creator: Eric",creatorNote:"Thank you for using PDF Signer."},
  "zh-Hant":{label:"繁體中文",welcomeTitle:"簽署您的文件",welcomeDescription:"上載 PDF、JPG、JPEG、PNG、WEBP、HEIC 或 HEIF。圖片會自動轉換為 PDF。",chooseFile:"選擇檔案",localNote:"所有編輯均在您的瀏覽器本機進行。",uploadFile:"上載檔案",fit:"適合頁面",text:"文字",name:"姓名",date:"日期",signature:"簽名",undo:"復原",delete:"刪除",exportPdf:"匯出 PDF",addText:"加入文字",editText:"編輯文字",addName:"加入姓名",editName:"編輯姓名",enterText:"輸入文字",cancel:"取消",add:"加入",save:"儲存",pdfReady:"PDF 已準備好",saveToFiles:"儲存至檔案",share:"分享",openNewTab:"在新分頁開啟",exportHelp:"使用 <b>儲存至檔案</b> 儲存 PDF，或使用 <b>分享</b> 開啟系統分享功能。",drawSignature:"繪製新簽名",clear:"清除",saveUse:"儲存並使用",penStyle:"筆觸",penFine:"細筆",penBallpoint:"原子筆",penBold:"粗筆",penMarker:"麥克筆",inkColor:"墨色",noSavedSignatures:"尚未儲存簽名。",reuseSignature:"已儲存的簽名 — 點擊即可重用",readme:"使用說明",readmeTitle:"PDF Signer — 使用說明",readmeIntro:"PDF Signer 可讓您在 PDF 及圖片文件加入文字、姓名、日期及手寫簽名。文件會在您的瀏覽器本機處理。",howTo:"使用方法",steps:["選擇 PDF 或支援的圖片檔案。","使用「文字」、「姓名」、「日期」或「簽名」在目前頁面加入內容。","拖曳內容即可移動；拖曳控制點即可調整大小。雙擊文字或姓名即可編輯。","需要時可使用「復原」或「刪除」。","選擇「匯出 PDF」，然後可儲存至檔案、分享或在新分頁開啟。"],formats:"支援格式",formatsText:"PDF、JPG、JPEG、PNG、WEBP、HEIC 及 HEIF。",privacy:"私隱",privacyText:"文件及編輯內容均在此瀏覽器本機處理，應用程式無需將文件上載至伺服器。",creator:"創作者：Eric",creatorNote:"感謝您使用 PDF Signer。"},
  "zh-Hans":{label:"简体中文",welcomeTitle:"签署您的文件",welcomeDescription:"上传 PDF、JPG、JPEG、PNG、WEBP、HEIC 或 HEIF。图片会自动转换为 PDF。",chooseFile:"选择文件",localNote:"所有编辑均在您的浏览器本地进行。",uploadFile:"上传文件",fit:"适合页面",text:"文字",name:"姓名",date:"日期",signature:"签名",undo:"撤销",delete:"删除",exportPdf:"导出 PDF",addText:"添加文字",editText:"编辑文字",addName:"添加姓名",editName:"编辑姓名",enterText:"输入文字",cancel:"取消",add:"添加",save:"保存",pdfReady:"PDF 已准备好",saveToFiles:"保存到文件",share:"分享",openNewTab:"在新标签页打开",exportHelp:"使用 <b>保存到文件</b> 保存 PDF，或使用 <b>分享</b> 打开系统分享功能。",drawSignature:"绘制新签名",clear:"清除",saveUse:"保存并使用",penStyle:"笔触",penFine:"细笔",penBallpoint:"圆珠笔",penBold:"粗笔",penMarker:"马克笔",inkColor:"墨色",noSavedSignatures:"尚未保存签名。",reuseSignature:"已保存的签名 — 点击即可重用",readme:"使用说明",readmeTitle:"PDF Signer — 使用说明",readmeIntro:"PDF Signer 可让您在 PDF 和图片文件中添加文字、姓名、日期及手写签名。文件会在您的浏览器本地处理。",howTo:"使用方法",steps:["选择 PDF 或支持的图片文件。","使用“文字”、“姓名”、“日期”或“签名”在当前页面添加内容。","拖动内容即可移动；拖动控制点即可调整大小。双击文字或姓名即可编辑。","需要时可使用“撤销”或“删除”。","选择“导出 PDF”，然后可保存到文件、分享或在新标签页打开。"],formats:"支持格式",formatsText:"PDF、JPG、JPEG、PNG、WEBP、HEIC 和 HEIF。",privacy:"隐私",privacyText:"文件和编辑内容均在此浏览器本地处理，应用程序无需将文件上传到服务器。",creator:"创作者：Eric",creatorNote:"感谢您使用 PDF Signer。"},
  ja:{label:"日本語",welcomeTitle:"書類に署名",welcomeDescription:"PDF、JPG、JPEG、PNG、WEBP、HEIC、HEIFをアップロードできます。画像は自動的にPDFへ変換されます。",chooseFile:"ファイルを選択",localNote:"すべての編集はブラウザ上でローカルに行われます。",uploadFile:"ファイルをアップロード",fit:"ページに合わせる",text:"テキスト",name:"名前",date:"日付",signature:"署名",undo:"元に戻す",delete:"削除",exportPdf:"PDFを書き出す",addText:"テキストを追加",editText:"テキストを編集",addName:"名前を追加",editName:"名前を編集",enterText:"テキストを入力",cancel:"キャンセル",add:"追加",save:"保存",pdfReady:"PDFの準備完了",saveToFiles:"ファイルに保存",share:"共有",openNewTab:"新しいタブで開く",exportHelp:"<b>ファイルに保存</b>でPDFを保存するか、<b>共有</b>でシステムの共有画面を開きます。",drawSignature:"新しい署名を描く",clear:"クリア",saveUse:"保存して使用",penStyle:"ペン",penFine:"細字",penBallpoint:"ボールペン",penBold:"太字",penMarker:"マーカー",inkColor:"インク",textSize:"サイズ",textColor:"色",noSavedSignatures:"保存された署名はありません。",reuseSignature:"保存済みの署名 — タップして再利用",readme:"使い方",readmeTitle:"PDF Signer — 使い方",readmeIntro:"PDF Signerでは、PDFや画像にテキスト、名前、日付、手書き署名を追加できます。ファイルはブラウザ上でローカル処理されます。",howTo:"使い方",steps:["PDFまたは対応画像を選択します。","「テキスト」「名前」「日付」「署名」で現在のページに追加します。","項目をドラッグして移動し、ハンドルをドラッグしてサイズを変更します。テキストや名前はダブルタップで編集できます。","必要に応じて「元に戻す」または「削除」を使用します。","「PDFを書き出す」を選択し、保存、共有、または新しいタブで開きます。"],formats:"対応形式",formatsText:"PDF、JPG、JPEG、PNG、WEBP、HEIC、HEIF。",privacy:"プライバシー",privacyText:"ファイルと編集内容はこのブラウザ内でローカル処理され、サーバーへのアップロードは必要ありません。",creator:"作成者：Eric",creatorNote:"PDF Signerをご利用いただきありがとうございます。"},
  ko:{label:"한국어",welcomeTitle:"문서에 서명하기",welcomeDescription:"PDF, JPG, JPEG, PNG, WEBP, HEIC 또는 HEIF를 업로드할 수 있습니다. 이미지는 자동으로 PDF로 변환됩니다.",chooseFile:"파일 선택",localNote:"모든 편집은 브라우저에서 로컬로 처리됩니다.",uploadFile:"파일 업로드",fit:"페이지 맞춤",text:"텍스트",name:"이름",date:"날짜",signature:"서명",undo:"실행 취소",delete:"삭제",exportPdf:"PDF 내보내기",addText:"텍스트 추가",editText:"텍스트 편집",addName:"이름 추가",editName:"이름 편집",enterText:"텍스트 입력",cancel:"취소",add:"추가",save:"저장",pdfReady:"PDF 준비 완료",saveToFiles:"파일에 저장",share:"공유",openNewTab:"새 탭에서 열기",exportHelp:"<b>파일에 저장</b>하여 PDF를 저장하거나 <b>공유</b>로 시스템 공유 화면을 엽니다.",drawSignature:"새 서명 그리기",clear:"지우기",saveUse:"저장 후 사용",penStyle:"펜",penFine:"가는 펜",penBallpoint:"볼펜",penBold:"굵은 펜",penMarker:"마커",inkColor:"잉크",textSize:"크기",textColor:"색상",noSavedSignatures:"저장된 서명이 없습니다.",reuseSignature:"저장된 서명 — 눌러서 재사용",readme:"사용 안내",readmeTitle:"PDF Signer — 사용 안내",readmeIntro:"PDF Signer를 사용하면 PDF와 이미지 문서에 텍스트, 이름, 날짜 및 손글씨 서명을 추가할 수 있습니다. 문서는 브라우저에서 로컬로 처리됩니다.",howTo:"사용 방법",steps:["PDF 또는 지원되는 이미지를 선택합니다.","‘텍스트’, ‘이름’, ‘날짜’ 또는 ‘서명’을 사용해 현재 페이지에 추가합니다.","항목을 드래그하여 이동하고 핸들을 드래그하여 크기를 조절합니다. 텍스트와 이름은 두 번 눌러 편집할 수 있습니다.","필요하면 ‘실행 취소’ 또는 ‘삭제’를 사용합니다.","‘PDF 내보내기’를 선택한 후 저장, 공유 또는 새 탭에서 열기를 선택합니다."],formats:"지원 형식",formatsText:"PDF, JPG, JPEG, PNG, WEBP, HEIC, HEIF.",privacy:"개인정보 보호",privacyText:"파일과 편집 내용은 이 브라우저에서 로컬로 처리되며 서버에 업로드할 필요가 없습니다.",creator:"제작자: Eric",creatorNote:"PDF Signer를 사용해 주셔서 감사합니다."},
  nl:{label:"Nederlands",welcomeTitle:"Uw document ondertekenen",welcomeDescription:"Upload PDF, JPG, JPEG, PNG, WEBP, HEIC of HEIF. Afbeeldingen worden automatisch naar PDF omgezet.",chooseFile:"Bestand kiezen",localNote:"Alle bewerkingen worden lokaal in uw browser uitgevoerd.",uploadFile:"Bestand uploaden",fit:"Passend",text:"Tekst",name:"Naam",date:"Datum",signature:"Handtekening",undo:"Ongedaan maken",delete:"Verwijderen",exportPdf:"PDF exporteren",addText:"Tekst toevoegen",editText:"Tekst bewerken",addName:"Naam toevoegen",editName:"Naam bewerken",enterText:"Tekst invoeren",cancel:"Annuleren",add:"Toevoegen",save:"Opslaan",pdfReady:"PDF gereed",saveToFiles:"Opslaan naar bestanden",share:"Delen",openNewTab:"Openen in nieuw tabblad",exportHelp:"Gebruik <b>Opslaan naar bestanden</b> om de PDF op te slaan of <b>Delen</b> om het systeemdeelmenu te openen.",drawSignature:"Nieuwe handtekening tekenen",clear:"Wissen",saveUse:"Opslaan en gebruiken",penStyle:"Pen",penFine:"Fijn",penBallpoint:"Balpen",penBold:"Vet",penMarker:"Marker",inkColor:"Inkt",textSize:"Grootte",textColor:"Kleur",noSavedSignatures:"Nog geen opgeslagen handtekeningen.",reuseSignature:"Opgeslagen handtekeningen — tik om opnieuw te gebruiken",readme:"Lees mij",readmeTitle:"PDF Signer — Lees mij",readmeIntro:"Met PDF Signer kunt u tekst, namen, datums en handgeschreven handtekeningen toevoegen aan PDF- en afbeeldingsdocumenten. Uw document wordt lokaal in uw browser verwerkt.",howTo:"Gebruik",steps:["Kies een PDF of ondersteund afbeeldingsbestand.","Gebruik Tekst, Naam, Datum of Handtekening om iets aan de huidige pagina toe te voegen.","Sleep een item om het te verplaatsen. Sleep de handgreep om het formaat te wijzigen. Dubbelklik op tekst of naam om te bewerken.","Gebruik indien nodig Ongedaan maken of Verwijderen.","Kies PDF exporteren en daarna Opslaan naar bestanden, Delen of Openen in nieuw tabblad."],formats:"Ondersteunde formaten",formatsText:"PDF, JPG, JPEG, PNG, WEBP, HEIC en HEIF.",privacy:"Privacy",privacyText:"Bestanden en bewerkingen worden lokaal in deze browser verwerkt. De app hoeft uw document niet naar een server te uploaden.",creator:"Maker: Eric",creatorNote:"Bedankt voor het gebruiken van PDF Signer."},
  de:{label:"Deutsch",welcomeTitle:"Dokument unterschreiben",welcomeDescription:"PDF, JPG, JPEG, PNG, WEBP, HEIC oder HEIF hochladen. Bilder werden automatisch in PDF umgewandelt.",chooseFile:"Datei auswählen",localNote:"Alle Bearbeitungen erfolgen lokal in Ihrem Browser.",uploadFile:"Datei hochladen",fit:"Anpassen",text:"Text",name:"Name",date:"Datum",signature:"Unterschrift",undo:"Rückgängig",delete:"Löschen",exportPdf:"PDF exportieren",addText:"Text hinzufügen",editText:"Text bearbeiten",addName:"Name hinzufügen",editName:"Name bearbeiten",enterText:"Text eingeben",cancel:"Abbrechen",add:"Hinzufügen",save:"Speichern",pdfReady:"PDF bereit",saveToFiles:"In Dateien speichern",share:"Teilen",openNewTab:"In neuem Tab öffnen",exportHelp:"Mit <b>In Dateien speichern</b> speichern oder mit <b>Teilen</b> das System-Teilen öffnen.",drawSignature:"Neue Unterschrift zeichnen",clear:"Löschen",saveUse:"Speichern & verwenden",textSize:"Größe",textColor:"Farbe",noSavedSignatures:"Noch keine gespeicherten Unterschriften.",reuseSignature:"Gespeicherte Unterschriften — antippen zum Wiederverwenden",readme:"Anleitung",readmeTitle:"PDF Signer — Anleitung",readmeIntro:"Mit PDF Signer können Sie Text, Namen, Daten und handschriftliche Unterschriften zu PDF- und Bilddokumenten hinzufügen. Das Dokument wird lokal im Browser verarbeitet.",howTo:"Verwendung",steps:["Wählen Sie eine PDF- oder unterstützte Bilddatei.","Fügen Sie mit Text, Name, Datum oder Unterschrift Inhalte zur aktuellen Seite hinzu.","Ziehen Sie ein Element zum Verschieben. Ziehen Sie den Griff zum Ändern der Größe. Text oder Namen können per Doppelklick bearbeitet werden.","Verwenden Sie bei Bedarf Rückgängig oder Löschen.","Wählen Sie PDF exportieren und danach Speichern, Teilen oder In neuem Tab öffnen."],formats:"Unterstützte Formate",formatsText:"PDF, JPG, JPEG, PNG, WEBP, HEIC und HEIF.",privacy:"Datenschutz",privacyText:"Dateien und Bearbeitungen werden lokal in diesem Browser verarbeitet. Das Dokument muss nicht auf einen Server hochgeladen werden.",creator:"Ersteller: Eric",creatorNote:"Vielen Dank für die Nutzung von PDF Signer."},
  fr:{label:"Français",welcomeTitle:"Signer votre document",welcomeDescription:"Importez un PDF, JPG, JPEG, PNG, WEBP, HEIC ou HEIF. Les images sont automatiquement converties en PDF.",chooseFile:"Choisir un fichier",localNote:"Toutes les modifications sont effectuées localement dans votre navigateur.",uploadFile:"Importer un fichier",fit:"Ajuster",text:"Texte",name:"Nom",date:"Date",signature:"Signature",undo:"Annuler",delete:"Supprimer",exportPdf:"Exporter le PDF",addText:"Ajouter du texte",editText:"Modifier le texte",addName:"Ajouter un nom",editName:"Modifier le nom",enterText:"Saisir le texte",cancel:"Annuler",add:"Ajouter",save:"Enregistrer",pdfReady:"PDF prêt",saveToFiles:"Enregistrer dans Fichiers",share:"Partager",openNewTab:"Ouvrir dans un nouvel onglet",exportHelp:"Utilisez <b>Enregistrer dans Fichiers</b> pour enregistrer le PDF ou <b>Partager</b> pour ouvrir le partage système.",drawSignature:"Dessiner une nouvelle signature",clear:"Effacer",saveUse:"Enregistrer et utiliser",penStyle:"Stylo",penFine:"Fin",penBallpoint:"Stylo bille",penBold:"Épais",penMarker:"Marqueur",inkColor:"Encre",textSize:"Taille",textColor:"Couleur",noSavedSignatures:"Aucune signature enregistrée.",reuseSignature:"Signatures enregistrées — touchez pour réutiliser",readme:"Lisez-moi",readmeTitle:"PDF Signer — Lisez-moi",readmeIntro:"PDF Signer permet d’ajouter du texte, des noms, des dates et des signatures manuscrites aux PDF et aux images. Le document est traité localement dans votre navigateur.",howTo:"Utilisation",steps:["Choisissez un PDF ou une image prise en charge.","Utilisez Texte, Nom, Date ou Signature pour ajouter un élément à la page actuelle.","Faites glisser un élément pour le déplacer et sa poignée pour le redimensionner. Double-cliquez sur un texte ou un nom pour le modifier.","Utilisez Annuler ou Supprimer si nécessaire.","Choisissez Exporter le PDF, puis Enregistrer, Partager ou Ouvrir dans un nouvel onglet."],formats:"Formats pris en charge",formatsText:"PDF, JPG, JPEG, PNG, WEBP, HEIC et HEIF.",privacy:"Confidentialité",privacyText:"Les fichiers et modifications sont traités localement dans ce navigateur. Le document n’a pas besoin d’être envoyé à un serveur.",creator:"Créateur : Eric",creatorNote:"Merci d’utiliser PDF Signer."},
  es:{label:"Español",welcomeTitle:"Firmar su documento",welcomeDescription:"Suba PDF, JPG, JPEG, PNG, WEBP, HEIC o HEIF. Las imágenes se convierten automáticamente a PDF.",chooseFile:"Elegir archivo",localNote:"Todas las ediciones se realizan localmente en su navegador.",uploadFile:"Subir archivo",fit:"Ajustar",text:"Texto",name:"Nombre",date:"Fecha",signature:"Firma",undo:"Deshacer",delete:"Eliminar",exportPdf:"Exportar PDF",addText:"Añadir texto",editText:"Editar texto",addName:"Añadir nombre",editName:"Editar nombre",enterText:"Introducir texto",cancel:"Cancelar",add:"Añadir",save:"Guardar",pdfReady:"PDF listo",saveToFiles:"Guardar en Archivos",share:"Compartir",openNewTab:"Abrir en una pestaña nueva",exportHelp:"Use <b>Guardar en Archivos</b> para guardar el PDF o <b>Compartir</b> para abrir el menú del sistema.",drawSignature:"Dibujar una nueva firma",clear:"Borrar",saveUse:"Guardar y usar",penStyle:"Pluma",penFine:"Fina",penBallpoint:"Bolígrafo",penBold:"Gruesa",penMarker:"Marcador",inkColor:"Tinta",textSize:"Tamaño",textColor:"Color",noSavedSignatures:"Aún no hay firmas guardadas.",reuseSignature:"Firmas guardadas — toque para reutilizar",readme:"Instrucciones",readmeTitle:"PDF Signer — Instrucciones",readmeIntro:"PDF Signer permite añadir texto, nombres, fechas y firmas manuscritas a documentos PDF e imágenes. El documento se procesa localmente en su navegador.",howTo:"Cómo usar",steps:["Elija un PDF o una imagen compatible.","Use Texto, Nombre, Fecha o Firma para añadir un elemento a la página actual.","Arrastre un elemento para moverlo y su controlador para cambiar su tamaño. Haga doble clic en texto o nombre para editarlo.","Use Deshacer o Eliminar cuando sea necesario.","Elija Exportar PDF y después Guardar, Compartir o Abrir en una pestaña nueva."],formats:"Formatos compatibles",formatsText:"PDF, JPG, JPEG, PNG, WEBP, HEIC y HEIF.",privacy:"Privacidad",privacyText:"Los archivos y las ediciones se procesan localmente en este navegador. No es necesario subir el documento a un servidor.",creator:"Creador: Eric",creatorNote:"Gracias por usar PDF Signer."}
};
function detectLanguage(){const prefs=[...(navigator.languages||[]),navigator.language||"en"];for(const raw of prefs){const l=raw.toLowerCase();if(l.startsWith("zh-hant")||l.includes("zh-tw")||l.includes("zh-hk")||l.includes("zh-mo"))return "zh-Hant";if(l.startsWith("zh"))return "zh-Hans";for(const k of ["ja","ko","nl","de","fr","es"]){if(l.startsWith(k))return k}}return "en"}
let currentLanguage=localStorage.getItem("pdfSignerLanguage")||detectLanguage();if(!LANGS[currentLanguage])currentLanguage="en";
function tr(key){return LANGS[currentLanguage]?.[key]??LANGS.en[key]??key}
function applyLanguage(){document.documentElement.lang=currentLanguage;const dict=LANGS[currentLanguage];document.querySelectorAll("[data-i18n]").forEach(el=>{const k=el.dataset.i18n;if(dict[k]!=null)el.textContent=dict[k]});document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>el.placeholder=tr(el.dataset.i18nPlaceholder));document.querySelectorAll("[data-i18n-html]").forEach(el=>el.innerHTML=tr(el.dataset.i18nHtml));languageSelect.value=currentLanguage;readmeContent.innerHTML=`<p>${dict.readmeIntro}</p><h3>${dict.howTo}</h3><ol>${dict.steps.map(x=>`<li>${x}</li>`).join("")}</ol><h3>${dict.formats}</h3><p>${dict.formatsText}</p><h3>${dict.privacy}</h3><p>${dict.privacyText}</p><div class="readme-creator">${dict.creator}<div class="muted">${dict.creatorNote}</div></div>`;updateControls()}
function initLanguages(){for(const [code,d] of Object.entries(LANGS)){const o=document.createElement("option");o.value=code;o.textContent=d.label;languageSelect.appendChild(o)}languageSelect.value=currentLanguage;languageSelect.onchange=()=>{currentLanguage=languageSelect.value;localStorage.setItem("pdfSignerLanguage",currentLanguage);applyLanguage()};applyLanguage()}
initLanguages();readmeBtn.onclick=()=>readmeModal.classList.remove("hidden");readmeClose.onclick=()=>readmeModal.classList.add("hidden");readmeModal.addEventListener("click",e=>{if(e.target===readmeModal)readmeModal.classList.add("hidden")});
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
pdfInput.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{await openDocument(f)}catch(err){console.error(err);alert(currentLanguage==="en"?"This file could not be opened. Please check that it is a valid PDF or supported image.":`${tr("uploadFile")}: ${tr("formatsText")}`)}};
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
function addTextLike(type,value){commit();const list=currentList();const w=type==="name"?170:150,h=34,pos=newAnnotationPosition(w,h);list.push({id:newId(),type,text:value,x:pos.x,y:pos.y,w,h,fontSize:18,color:"#111827"});setCurrentList(list);selectedId=list.at(-1).id;renderPage()}
function showTextDialog(type,id=null){pendingTextType=type;editingId=id;textDialogTitle.textContent=id?(type==="name"?tr("editName"):tr("editText")):(type==="name"?tr("addName"):tr("addText"));const a=id?currentList().find(x=>x.id===id):null;textInput.value=a?.text||"";textConfirm.textContent=id?tr("save"):tr("add");textDialog.classList.remove("hidden");setTimeout(()=>{textInput.focus();textInput.select()},50)}
addText.onclick=()=>showTextDialog("text");addName.onclick=()=>showTextDialog("name");
addDate.onclick=()=>{commit();const l=currentList(),w=130,h=34,pos=newAnnotationPosition(w,h);l.push({id:newId(),type:"date",text:today(),x:pos.x,y:pos.y,w,h,fontSize:18,color:"#111827"});setCurrentList(l);selectedId=l.at(-1).id;renderPage()};
textCancel.onclick=()=>{textDialog.classList.add("hidden");editingId=null};
textConfirm.onclick=()=>{const v=textInput.value.trim();if(!v)return;if(editingId){const a=currentList().find(x=>x.id===editingId);if(a){commit();a.text=v;renderPage()}}else addTextLike(pendingTextType,v);textDialog.classList.add("hidden");editingId=null};
textInput.onkeydown=e=>{if(e.key==="Enter")textConfirm.click();if(e.key==="Escape")textCancel.click()};
let drawing=false,signatureHasInk=false,sigCtx=signatureCanvas.getContext("2d");
const PEN_STYLES={fine:{width:1.5,cap:"round",join:"round"},ballpoint:{width:2.4,cap:"round",join:"round"},bold:{width:3.8,cap:"round",join:"round"},marker:{width:5.2,cap:"round",join:"round"}};
let currentPenStyle="fine",currentInk="#111827";
function applySignatureBrush(){const st=PEN_STYLES[currentPenStyle]||PEN_STYLES.fine;sigCtx.lineWidth=st.width;sigCtx.lineCap=st.cap;sigCtx.lineJoin=st.join;sigCtx.strokeStyle=currentInk}
function resizeSig(){const r=signatureCanvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);signatureCanvas.width=Math.max(1,Math.round(r.width*d));signatureCanvas.height=Math.max(1,Math.round(r.height*d));sigCtx.setTransform(d,0,0,d,0,0);applySignatureBrush();signatureHasInk=false}
function sigPoint(e){const r=signatureCanvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function beginSig(e){drawing=true;signatureHasInk=true;const p=sigPoint(e);sigCtx.beginPath();sigCtx.moveTo(p.x,p.y);signatureCanvas.setPointerCapture?.(e.pointerId);e.preventDefault()}
function moveSig(e){if(!drawing)return;const p=sigPoint(e);sigCtx.lineTo(p.x,p.y);sigCtx.stroke();e.preventDefault()}
function endSig(){drawing=false}
signatureCanvas.addEventListener("pointerdown",beginSig);signatureCanvas.addEventListener("pointermove",moveSig);signatureCanvas.addEventListener("pointerup",endSig);signatureCanvas.addEventListener("pointercancel",endSig);
penStyleGroup.addEventListener("click",e=>{const b=e.target.closest(".pen-style");if(!b)return;currentPenStyle=b.dataset.style||"fine";penStyleGroup.querySelectorAll(".pen-style").forEach(x=>x.classList.toggle("active",x===b));applySignatureBrush()});
signatureColorInput.addEventListener("input",()=>{currentInk=signatureColorInput.value||"#111827";applySignatureBrush()});
function getSavedSignatures(){try{return JSON.parse(localStorage.getItem("pdfSignerSignatures")||"[]")}catch{return[]}}
function saveSignature(data){const list=getSavedSignatures().filter(x=>x!==data);list.unshift(data);localStorage.setItem("pdfSignerSignatures",JSON.stringify(list.slice(0,10)))}
function renderSavedSignatures(){const list=getSavedSignatures();savedSignatures.innerHTML="";if(!list.length){savedSignatures.innerHTML=`<div class="empty-signatures">${tr("noSavedSignatures")}</div>`;return}const title=document.createElement("div");title.className="signature-label";title.textContent=tr("reuseSignature");savedSignatures.appendChild(title);const grid=document.createElement("div");grid.className="signature-grid";list.forEach(data=>{const b=document.createElement("button");b.className="saved-signature";const img=document.createElement("img");img.src=data;b.appendChild(img);b.onclick=()=>useSignature(data);grid.appendChild(b)});savedSignatures.appendChild(grid)}
function clearSig(){resizeSig()}
function useSignature(data){commit();const l=currentList(),w=180,h=70,pos=newAnnotationPosition(w,h);l.push({id:newId(),type:"signature",data,x:pos.x,y:pos.y,w,h,fontSize:0});setCurrentList(l);selectedId=l.at(-1).id;signatureDialog.classList.add("hidden");renderPage()}
addSignature.onclick=()=>{signatureDialog.classList.remove("hidden");renderSavedSignatures();setTimeout(()=>{resizeSig()},30)};
signatureClear.onclick=clearSig;signatureCancel.onclick=()=>signatureDialog.classList.add("hidden");
signatureConfirm.onclick=()=>{if(!signatureHasInk){alert(currentLanguage==="zh-Hant"?"請先繪製簽名。":currentLanguage==="zh-Hans"?"请先绘制签名。":currentLanguage==="ja"?"先に署名を描いてください。":currentLanguage==="ko"?"먼저 서명을 그려 주세요.":currentLanguage==="nl"?"Teken eerst een handtekening.":currentLanguage==="de"?"Bitte zeichnen Sie zuerst eine Unterschrift.":currentLanguage==="fr"?"Veuillez d’abord dessiner une signature.":currentLanguage==="es"?"Dibuje primero una firma.":"Please draw a signature first.");return}const data=signatureCanvas.toDataURL("image/png");saveSignature(data);useSignature(data)};
function select(id){selectedId=id;styleEditStarted=false;document.querySelectorAll(".annotation").forEach(e=>e.classList.toggle("selected",e.dataset.id===id));updateControls();refreshTextProperties()}
function removeSelected(){if(!selectedId)return;const l=currentList(),i=l.findIndex(a=>a.id===selectedId);if(i<0)return;commit();l.splice(i,1);setCurrentList(l);selectedId=null;renderPage()}
deleteSelected.onclick=removeSelected;
function selectedTextAnnotation(){const a=currentList().find(x=>x.id===selectedId);return a&&(a.type==="text"||a.type==="name"||a.type==="date")?a:null}
let styleEditStarted=false;
function refreshTextProperties(){const a=selectedTextAnnotation();textProperties.classList.toggle("hidden",!a);if(a){fontSizeInput.value=Math.round(a.fontSize||18);textColorInput.value=a.color||"#111827"}}
function beginStyleEdit(){if(!styleEditStarted){commit();styleEditStarted=true}}
function endStyleEdit(){styleEditStarted=false}
function applyFontSize(v){const a=selectedTextAnnotation();if(!a)return;beginStyleEdit();a.fontSize=Math.max(6,Math.min(96,Number(v)||18));fontSizeInput.value=Math.round(a.fontSize);renderPage()}
function applyTextColor(v){const a=selectedTextAnnotation();if(!a)return;beginStyleEdit();a.color=v||"#111827";textColorInput.value=a.color;renderPage()}
fontSizeInput.addEventListener("focus",beginStyleEdit);fontSizeInput.addEventListener("change",()=>{applyFontSize(fontSizeInput.value);endStyleEdit()});
fontSizeDown.onclick=()=>{const a=selectedTextAnnotation();if(a){applyFontSize((a.fontSize||18)-1);endStyleEdit()}};fontSizeUp.onclick=()=>{const a=selectedTextAnnotation();if(a){applyFontSize((a.fontSize||18)+1);endStyleEdit()}};
textColorInput.addEventListener("pointerdown",beginStyleEdit);textColorInput.addEventListener("input",()=>applyTextColor(textColorInput.value));textColorInput.addEventListener("change",endStyleEdit);
function makeAnnotation(a,wrapper){const el=document.createElement("div");el.className=`annotation ${a.type}${a.id===selectedId?" selected":""}`;el.dataset.id=a.id;el.style.left=`${a.x*zoom}px`;el.style.top=`${a.y*zoom}px`;el.style.width=`${a.w*zoom}px`;el.style.height=`${a.h*zoom}px`;
if(a.type!=="signature"){el.textContent=a.text;el.style.fontSize=`${a.fontSize*zoom}px`;el.style.color=a.color||"#111827";el.style.background="transparent";el.style.display="flex";el.style.alignItems="center"}else{const img=document.createElement("img");img.src=a.data;el.appendChild(img)}
const del=document.createElement("button");del.className="delete-handle";del.textContent="×";del.title=tr("delete");del.onclick=e=>{e.stopPropagation();select(a.id);removeSelected()};const handle=document.createElement("span");handle.className="resize-handle";el.append(del,handle);
let mode=null,sx=0,sy=0,ax=0,ay=0,aw=0,ah=0;el.addEventListener("dblclick",e=>{e.stopPropagation();if(a.type==="text"||a.type==="name")showTextDialog(a.type,a.id)});
el.addEventListener("pointerdown",e=>{if(e.target===del||e.target===handle)return;select(a.id);mode="move";sx=e.clientX;sy=e.clientY;ax=a.x;ay=a.y;try{el.setPointerCapture(e.pointerId)}catch{}e.preventDefault();e.stopPropagation()});
handle.addEventListener("pointerdown",e=>{select(a.id);mode="resize";sx=e.clientX;sy=e.clientY;aw=a.w;ah=a.h;try{handle.setPointerCapture(e.pointerId)}catch{}e.preventDefault();e.stopPropagation()});
el.addEventListener("pointermove",e=>{if(!mode)return;if(mode==="move"){a.x=Math.max(0,ax+(e.clientX-sx)/zoom);a.y=Math.max(0,ay+(e.clientY-sy)/zoom)}else{a.w=Math.max(45,aw+(e.clientX-sx)/zoom);a.h=Math.max(24,ah+(e.clientY-sy)/zoom)}el.style.left=`${a.x*zoom}px`;el.style.top=`${a.y*zoom}px`;el.style.width=`${a.w*zoom}px`;el.style.height=`${a.h*zoom}px`;if(a.type!=="signature")el.style.fontSize=`${a.fontSize*zoom}px`});
el.addEventListener("pointerup",()=>{if(mode){commit();mode=null}});el.addEventListener("pointercancel",()=>{if(mode){commit();mode=null}});wrapper.appendChild(el)}
async function renderPage(){if(!pdfDocument)return;const ver=++renderVersion,pn=currentPage,page=await pdfDocument.getPage(pn),vp=page.getViewport({scale:zoom}),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{alpha:false}),ds=Math.min(devicePixelRatio||1,2);canvas.className="pdf-page";canvas.width=Math.floor(vp.width*ds);canvas.height=Math.floor(vp.height*ds);canvas.style.width=`${vp.width}px`;canvas.style.height=`${vp.height}px`;await page.render({canvasContext:ctx,viewport:vp,transform:ds!==1?[ds,0,0,ds,0,0]:undefined}).promise;if(ver!==renderVersion||pn!==currentPage)return;const wrap=document.createElement("div");wrap.className="pdf-page-wrapper";wrap.style.width=`${vp.width}px`;wrap.style.height=`${vp.height}px`;wrap.appendChild(canvas);for(const a of currentList())makeAnnotation(a,wrap);pdfContainer.replaceChildren(wrap);updateControls()}
function updateControls(){pageInfo.textContent=`${currentLanguage==="zh-Hant"?"第":currentLanguage==="zh-Hans"?"第":currentLanguage==="ja"?"ページ ":currentLanguage==="ko"?"페이지 ":"Page "}${currentPage}${currentLanguage.startsWith("zh")?" / ":currentLanguage==="ja"?" / ":currentLanguage==="ko"?" / ":" / "}${pdfDocument?.numPages||1}${currentLanguage.startsWith("zh")?" 頁":""}`;zoomInfo.textContent=`${Math.round(zoom*100)}%`;prevPage.disabled=!pdfDocument||currentPage<=1;nextPage.disabled=!pdfDocument||currentPage>=pdfDocument.numPages;undoBtn.disabled=!history.length;deleteSelected.disabled=!selectedId;refreshTextProperties()}
async function fitCurrentPageToWidth(){if(!pdfDocument)return;const p=await pdfDocument.getPage(currentPage),u=p.getViewport({scale:1}),available=Math.max(180,pdfArea.clientWidth-24),target=Math.min(available/u.width,3);zoom=Math.max(.25,Math.round(target*100)/100);await renderPage()}
prevPage.onclick=async()=>{if(currentPage>1){currentPage--;selectedId=null;await renderPage();await fitCurrentPageToWidth()}};nextPage.onclick=async()=>{if(pdfDocument&&currentPage<pdfDocument.numPages){currentPage++;selectedId=null;await renderPage();await fitCurrentPageToWidth()}};zoomOut.onclick=async()=>{if(pdfDocument){zoom=Math.max(.25,Math.round((zoom-.1)*10)/10);await renderPage()}};zoomIn.onclick=async()=>{if(pdfDocument){zoom=Math.min(3,Math.round((zoom+.1)*10)/10);await renderPage()}};fitPage.onclick=fitCurrentPageToWidth;undoBtn.onclick=async()=>{if(!history.length)return;restore(history.pop());await renderPage()};
function dataUrlBytes(data){const part=data.split(",")[1];if(!part)throw Error("Invalid image data");const b=atob(part);const a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
function textAnnotationDataUrl(text,fontSize,width,height,color="#111827"){
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
  ctx.fillStyle=color||"#111827"; ctx.textBaseline="middle"; ctx.textAlign="left";
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
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeName}</title><style>html,body{margin:0;height:100%;font-family:Arial,sans-serif;background:#525659;color:#fff}body{display:flex;flex-direction:column}.bar{height:52px;background:#fff;color:#222;display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;flex-shrink:0}.name{font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.btn{border:1px solid #ccc;background:#fff;border-radius:7px;padding:8px 14px;text-decoration:none;color:#222;font-size:14px}.pages{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;align-items:center;gap:18px;box-sizing:border-box}.page{background:#fff;box-shadow:0 3px 12px #0008;flex:0 0 auto}.page canvas{display:block;width:auto;height:auto}</style></head><body><div class="bar"><div class="name">${safeName}</div><a class="btn" id="download" download="${safeName}" href="${viewerUrl}">Save PDF</a></div><div class="pages" id="pages"><div>Loading PDF…</div></div><script type="module">import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";const url=${JSON.stringify(viewerUrl)};const pages=document.getElementById('pages');try{const doc=await pdfjsLib.getDocument({url}).promise;pages.innerHTML='';for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const base=page.getViewport({scale:1});const available=Math.max(280,pages.clientWidth-36);const scale=Math.min(1.5,available/base.width);const vp=page.getViewport({scale});const wrap=document.createElement('div');wrap.className='page';wrap.style.width=vp.width+'px';wrap.style.height=vp.height+'px';const canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);canvas.style.width=vp.width+'px';canvas.style.height=vp.height+'px';wrap.appendChild(canvas);pages.appendChild(wrap);await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:vp}).promise;}}catch(e){console.error(e);pages.textContent='Unable to preview PDF. Use Save PDF.';}</script></body></html>`);
  popup.document.close();
}
savePdf.onclick=saveExportedPdf;sharePdf.onclick=shareExportedPdf;openPdfTab.onclick=openExportedInNewTab;closeExportResult.onclick=closeExportPreview;
async function exportDocument(){
  if(!sourcePdfBytes){alert("Please upload a document first.");return}
  const L=window.PDFLib;if(!L?.PDFDocument){alert("PDF export library is unavailable. Please reload the page.");return}
  exportPdf.disabled=true;exportPdf.textContent=currentLanguage==="zh-Hant"?"匯出中…":currentLanguage==="zh-Hans"?"导出中…":currentLanguage==="ja"?"書き出し中…":currentLanguage==="ko"?"내보내는 중…":currentLanguage==="nl"?"Exporteren…":currentLanguage==="de"?"Exportieren…":currentLanguage==="fr"?"Exportation…":currentLanguage==="es"?"Exportando…":"Exporting…";
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
        const data=a.type==="signature"?a.data:textAnnotationDataUrl(a.text,a.fontSize*scaleX,w,h,a.color||"#111827");
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
  finally{exportPdf.disabled=false;exportPdf.textContent=tr("exportPdf")}
}
exportPdf.onclick=exportDocument;
window.addEventListener("resize",()=>{if(signatureDialog&&!signatureDialog.classList.contains("hidden")){const had=signatureHasInk;const data=had?signatureCanvas.toDataURL("image/png"):null;resizeSig();if(data){const img=new Image();img.onload=()=>{sigCtx.drawImage(img,0,0,signatureCanvas.clientWidth,signatureCanvas.clientHeight);signatureHasInk=true};img.src=data}}});
updateControls();
