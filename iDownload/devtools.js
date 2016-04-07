/*
 * Copy Right: Tencent ISUX
 * Comments: web下载插件
 * Author: kundy
 * Date: 2014-12-24
 */



window.onload=function(){
  panelInit();
}
window.onbeforeunload=function(){
}


function panelInit()
{
  chrome.devtools.panels.create( "Qdownload",  "icons/logo_48.png",  "panel.html",
      function() {
   
      }
  );
}




