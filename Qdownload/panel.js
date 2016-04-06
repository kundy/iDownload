/*
 * Copy Right: Tencent ISUX
 * Comments: web下载插件
 * Author: kundy
 * Date: 2014-12-24
 */



/*重写Console*/
function Console() {
}

Console.Type = {
  LOG: "log",
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  GROUP: "group",
  GROUP_COLLAPSED: "groupCollapsed",
  GROUP_END: "groupEnd"
};

Console.addMessage = function(type, format, args) {
  chrome.extension.sendMessage({
      method: "sendToConsole",
      tabId: tabId,
      args: escape(JSON.stringify(Array.prototype.slice.call(arguments, 0)))
  });
};

(function() {
      var console_types = Object.getOwnPropertyNames(Console.Type);
      for (var type = 0; type < console_types.length; ++type) {
            var method_name = Console.Type[console_types[type]];
            Console[method_name] = Console.addMessage.bind(Console, method_name);
      }
})();


$(document).ready(function(){
    $("h2 .logo,h2 .title").click(function(){
        window.open("http://kundy.github.io/Qdownload/");
    })

    tabId = chrome.devtools.inspectedWindow.tabId;
    FileOBJ.init();
    txtInit();
    btnInit();
});

//发送消息
function sendMessage(message) {
    message.tabId=tabId;
    message.taskName=taskName;
    chrome.extension.sendMessage(message);
}



var port;
var taskName = "Qdownload_" + Math.floor(Math.random()*1000000);
//接收消息
function createChannel() {
    //Create a port with background page for continous message communication
    port = chrome.extension.connect({name: taskName});
    
    // Listen to messages from the background page
    port.onMessage.addListener(function (message) {
      if(message.method && message.tabId){
        // Console.warn(message.method);
        if( message.tabId != tabId)return;

        if(message.method == "taskStart"){//获取当前已选择的tab的id和url
            handleTaskStart(message.content*1);
        }
        else if(message.method == "taskFinish"){//获取当前已选择的tab的id和url
            handleTaskFinish();
        }
        else if(message.method == "getSelectedTab"){//获取当前已选择的tab的id和url
            handleGetSelectedTab(message.url);
        }
        else if(message.method == "checkTabStatus"){//检查tab状态，是否加载完成
            handleCheckTabStatus(message.content);
        }
        else if(message.method == "checkDownloadStatus"){//检查文件下载进度
            handleCheckDownloadStatus(message.success,message.fail);
        }
        else if(message.method == "getFileData"){//获取文件下载后的base64数据
            handleGetFileData(message.i*1,message.status*1,message.data,message.size);
        }
      }
    });

};




//下载状态
var enumStatus = {
    ready: 0,
    start: 1,
    doing: 2,
    finish: 3
};
var global_zipWriter;
var URL = window.webkitURL || window.mozURL || window.URL;


var filelist=[];//下载文件列表 //[ 0文件url，1是否已下载，2文件重名标记，3文件base64数据对象，4文件名，5文件类型，6文件大小]
var downloadStatus=enumStatus.ready;//下载状态标记
var zipFilelist=[];//添加到zip的文件列表,防止重名引起zip挂掉
var downloadStatus=enumStatus.ready;
var tabId;//当前选中的tab标记
var zipName = "";//下载包名称
var tabstatusTimeout;//tab状态轮询
var downloadStatusTimeout;//下载状态轮询
var tabReloadTimeout;//tab刷新超时
var config={};//config选项
var fileSaveType=1;//1:根据文件类型保存，2:根据文件路径保存
var detectType = 0;//监控类型，0:自动 1:手动
var downloadSize = 0;//下载的总文件大小



//i18n
function txtInit(){
        $("#btnMode").text(chrome.i18n.getMessage( "mode" ));

}







//下载按钮初始化
function btnInit()
{

    $("#tipsLoadTimeout").mouseover(function(){
        $(".config-help").show();
        $(".config-help .ct").html("timeout for the page loading");
    })
    $("#tipsDownloadTimeout").mouseover(function(){
        $(".config-help").show();
        $(".config-help .ct").html("timeout for any resource downloading");
    })
    $("#tipsType").mouseover(function(){
        $(".config-help").show();
        $(".config-help .ct").html("<img src='img/type.png' />");
    })
    $("#tipsUrl").mouseover(function(){
        $(".config-help").show();
        $(".config-help .ct").html("<img src='img/path.png' />");
    })
    $("#tipsLog").mouseover(function(){
        $(".config-help").show();
        $(".config-help .ct").html("generate report.html");
    })

    $(".tips").mouseout(function(){
        $(".config-help").hide();
    })


    $("#btnStart").removeClass("btnDisabled").text("START").unbind("click").click(function(){
        if(detectType==0){
            $("#btnStart").unbind("click").text("Downloading");
            createChannel();
            sendMessage({method: "taskStart", content: ""});
        }
        else{
            $("#btnStart").unbind("click").text("Downloading");
            createChannel();
            sendMessage({method: "taskStart", content: ""});
        }
    })

    $("#btnMode").removeClass("btnDisabled").unbind("click").click(function(){
        if(detectType==1){
            detectType=0;
            $(".downloadStatus").show().html("<p>Mode changed! </p><p>refresh page and auto detecting files.</p>");
            $("#btnStop").hide(); 
        }
        else{
            detectType=1;
            $(".downloadStatus").show().html("<p>Mode changed! </p><p>start and stop detecting by user.</p>");
            $("#btnStop").show(); 
        }
    })

    $("#btnStop").addClass("btnDisabled");
}

function handleTaskStart(taskFlag)
{
   // chrome.tabs.query({active: true, currentWindow: true}, function (arrayOfTabs) {
   //      var code = 'window.location.reload();window.onload=function(){console.log("testasdfasdfasddf")}';
   //      chrome.tabs.executeScript(arrayOfTabs[0].id, {code: code});
   //  });

   //有其它任务 正在进行
   if(taskFlag){
        port.disconnect();
        $(".downloadStatus").show().html("<span style=\"color:#f00\">error</span>：wait other task finish");
        btnInit();
   }
   else{
        sendMessage({method: "getSelectedTab", content: tabId});
    }
}






function handleTaskFinish()
{
    btnInit();
    port.disconnect();
}



function checkTabStatus(){
    clearTimeout(tabstatusTimeout);
    tabstatusTimeout = setTimeout(function(){
        sendMessage({method: "checkTabStatus", content: ""});
    },100)
}

function handleCheckTabStatus(msg){
    if(msg == "2"){
         FileOBJ.ready();
    }
    else{
        checkTabStatus();
    }
}

//判断没有其它任务进行,当前url可用，正式进入任务
function handleGetSelectedTab(url){
    if(url.indexOf("http")==0 || url.indexOf("file")==0 ){
        $("#btnStart").addClass("btnDisabled");
        $("#btnMode").addClass("btnDisabled").unbind("click");
        $(".loading").show();
        $(".downloadStatus").show().html("");

        //各种数据初始化
        config = { loadingTimeout: $("[name='config_load_timeout']").val() , 
                    downloadTimeout:$("[name='config_download_timeout']").val(),
                    logFlag:$("[name='config_report']:checked").val() };
        downloadStatus=enumStatus.start;
        filelist = [];
        zipFilelist = [];
        downloadSize =0;
        ZipFile.init(url);
        fileSaveType=$("input[name='config_path']:checked").val();

        //手动
        if(detectType==1){
            $("#btnStop").removeClass("btnDisabled").unbind("click").bind("click",function(){
                FileOBJ.ready();
            });

        }
        else{//自动
            checkTabStatus();
            sendMessage({method: "tabStatusInit", content: ""});
            sendMessage({method: "reloadTab", content: ""});
            clearTimeout(tabReloadTimeout);
            tabReloadTimeout = setTimeout(tabReloadDidTimeout,config.loadingTimeout*1000);
        }
    }
    else{
        $(".downloadStatus").show().html("<span style=\"color:#f00\">error</span>：url error");
    }
}



function tabReloadDidTimeout(){
    clearTimeout(tabstatusTimeout);
    clearTimeout(tabReloadTimeout);
    FileOBJ.ready();
}


function checkDownloadStatus(){
    clearTimeout(downloadStatusTimeout);
    downloadStatusTimeout = setTimeout(function(){
        sendMessage({method: "checkDownloadStatus", content: ""});
    },100)
}

function handleCheckDownloadStatus(success,fail){
    // Console.log(filelist.length,success,fail);
    if(filelist.length==0){

        var html= "<p>sorry,detect 0 file</p>";
        $("#downloadStatus").html(html);
        $(".loading").hide();
        sendMessage({method: "taskFinish", content: ""});

        FileOBJ.finish();
        return;
    }

    var html="<p>";
    html+="Detect:<span style='display:inline-block;margin:0 5px;color:#39B231;font-weight:bold;'>"+filelist.length+"</span>files";
    html+="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Done:<span style='display:inline-block;margin:0 5px;color:#39B231;font-weight:bold;'>"+success+"</span>";
    if(fail>0)
        html+="&nbsp;&nbsp;&nbsp;&nbsp;Fail:<span style='display:inline-block;margin:0 5px;color:#ED5012;font-weight:bold;'>"+fail+"</span></p>";
    html+="</p>";


    $("#downloadStatus").html(html);

    if((success+fail)<filelist.length){
        checkDownloadStatus();
    }
    else if((success+fail) == filelist.length){
        FileOBJ.finish();
    }
}

function handleGetFileData(i,status,data,size){
    filelist[i][1] = status;
    filelist[i][3] = data;
    filelist[i][6] = size;
    if((i+1)==filelist.length)ZipFile.getType();
}




function updateStatus(){
    if(downloadStatus==enumStatus.start){
        var html="Detect <span style='display:inline-block;margin:0 5px;color:#39B231;font-weight:bold;'>"+filelist.length+"</span> files";
        $("#downloadStatus").html(html);
    }
}



 // BEGIN: UTILITY FUNCTIONS
var FileOBJ =function(){ }

FileOBJ.init=function(){
    chrome.devtools.network.onRequestFinished.addListener(function(request) {
        FileOBJ.add(request.request.url);
        //Console.warn(request.request.url)
    });

}

FileOBJ.add=function(fileUrl){
    if(downloadStatus != enumStatus.start)return;
    if(fileUrl.indexOf("http")==0){
        filelist.push([fileUrl,0,0,"","","",0]);
        updateStatus();
    }
}

FileOBJ.ready=function(){
    downloadStatus=enumStatus.doing;
    checkDownloadStatus();//轮询下载状态
    sendMessage({method: "downloadFilelist", content: JSON.stringify(filelist),timeout:config.downloadTimeout});//触发background进行下载
    ZipFile.create();
}

FileOBJ.finish=function(){
    for(var i=0;i<filelist.length;i++){
        sendMessage({method: "getFileData", content: i });//获取文件数据
    }
}



var ZipFile = {}
ZipFile.init = function(url){
    zipName = url;
    if(zipName.indexOf('?')>0)zipName=zipName.substring(0,zipName.indexOf('?'));//去除?后面的参数
    //如果最后是个/，去掉
    if(zipName.lastIndexOf("/") == zipName.length-1){
        zipName = zipName.substring(0,zipName.length-1);
    }
    //文件禁用的符号 转换一下
    zipName = zipName.replace(/http:\/\//ig,"");
    zipName = zipName.replace(/https:\/\//ig,"");
    zipName = zipName.replace(/\//ig,"／");
    zipName = zipName.replace(/\\/ig,"／");
    zipName = zipName.replace(/\*/ig,"");
    zipName = zipName.replace(/\:/ig,"：");
    zipName = zipName.replace(/\"/ig,"〞");
    zipName = zipName.replace(/\</ig,"〈");
    zipName = zipName.replace(/\>/ig,"〉");
    zipName+=".zip";
}


//获取文件的真实类型
ZipFile.getType = function(){
    for(var i=0;i<filelist.length;i++){
        var fileNameData =getFileName(filelist[i][0]);
        filelist[i][4]=decodeURIComponent(fileNameData.name);
        var fileContentType = getContentType(filelist[i][3]);
        if(fileContentType!="")
            filelist[i][5]=fileContentType;
        else
            filelist[i][5]=fileNameData.type;

        //对某些类型的特殊处理
        if(fileNameData.type=="woff"){
            //http://os.oa.com/gulp-process-godzilla
            //在此页面，字体文件会被当成xml处理。。why?
            filelist[i][5]=fileNameData.type;
        }

        //对于根目录下的html页面，没有文件名时，文件名设置为上一级目录的名称
        if(filelist[i][5] == "html" || filelist[i][5] == "htm"){
            if(filelist[i][4]==""){
                var fileNameTemp = filelist[i][0].substring(0,filelist[i][0].lastIndexOf('/'))
                filelist[i][4] = fileNameTemp.substring(fileNameTemp.lastIndexOf('/')+1);
            }
        }

    }
    ZipFile.add(0);
}

ZipFile.create = function(){
    if(!global_zipWriter){
        zip.createWriter(new zip.BlobWriter(), function(zipWriter) {
                global_zipWriter = zipWriter;
        }, onerror);
    }
}


ZipFile.add = function(i){
    if(i<filelist.length){
        if(filelist[i][1]==1){
            downloadSize += filelist[i][6];
            var fileName = fileNameDuplicateRemove(filelist[i][0],filelist[i][4]+"."+filelist[i][5]);
            //根据文件类型保存
            if(fileSaveType==1){
                if(filelist[i][5] == "html" || filelist[i][5] == "htm" || filelist[i][5] == "xml")
                    fileName=fileName;
                else if(filelist[i][5] == "css")
                    fileName="css/"+fileName;
                else if(filelist[i][5] == "js" || filelist[i][5] == "json")
                    fileName="js/"+fileName; 
                else if(filelist[i][5] == "png" || filelist[i][5] == "jpg" || filelist[i][5] == "jpeg" || filelist[i][5] == "bpm" || filelist[i][5] == "gif" || filelist[i][5] == "webp")
                    fileName="image/"+fileName;
                else if(filelist[i][5] == "woff" || filelist[i][5] == "ttf")
                    fileName="font/"+fileName;
                else if(filelist[i][5] == "mp3" || filelist[i][5] == "mp4" || filelist[i][5] == "avi" || filelist[i][5] == "ogg" || filelist[i][5] == "webm" || filelist[i][5] == "ogv" || filelist[i][5] == "swf")
                    fileName="media/"+fileName;
                else
                    fileName="other/"+fileName;
            }

            //规避重名文件：以上逻辑做了比较多的重名过滤，如果还存在极端条件下的重复文件，直接跳过
            if(zipFilelist.indexOf(fileName)>=0){
                ZipFile.add(i+1);
            }
            else{
                zipFilelist.push(fileName);
                global_zipWriter.add(fileName, new zip.Data64URIReader(filelist[i][3]), function() {
                    ZipFile.add(i+1);
                });
            }
        }
        else{
            ZipFile.add(i+1);
        }
    }
    else{
        ZipFile.save();
    }
}


ZipFile.save = function(){
    // alert("save")
    var downloadButton = document.getElementById("btnDownload");
    global_zipWriter.close(function(blob) {
        var blobURL = URL.createObjectURL(blob);

        var clickEvent = document.createEvent("MouseEvent");
        clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        downloadButton.href = blobURL;
        downloadButton.download = zipName;
        downloadButton.dispatchEvent(clickEvent);

        global_zipWriter = null;

        $(".loading").hide();

        //显示下载文件大小
        var size ="";
        if(downloadSize<1024){
            size = downloadSize+"byte";
        }
        else if(downloadSize<1024*1024){
            size = Math.round(downloadSize*10/1024)/10+"KB";
        }
        else{
            size = Math.round(downloadSize*100/1024/1024)/100+"MB";
        }
        var html= "<p>download files size：<span style='display:inline-block;margin:0 5px;color:#39B231;font-weight:bold;'>"+size+"<span></p>";
        html += "<p>Package in zip：<a style=\"color:#670000\" href=\""+blobURL+"\" target=\"_blank\" download=\""+zipName+"\">"+zipName+"</a></p>";
        $("#downloadStatus").append(html);

        sendMessage({method: "taskFinish", content: ""});
    });
}

//检测重名的文件 ,如果有重名，文件名后加"_1"
function fileNameDuplicateRemove(url,name){
    var retName=name;
    for(var i=0;i<filelist.length;i++){
        if(filelist[i][4]+"."+filelist[i][5]==name){
            filelist[i][2]=filelist[i][2]+1;
            if(filelist[i][2]>1){
                retName=filelist[i][4]+"_"+filelist[i][2];
                if(filelist[i][5]!="")retName=retName+"."+filelist[i][5];//有些文件没有文件类型，也就没小数点
            }
        }
    }
    return retName;
}





var typeData = [

    //图片类
    {type:"jpg",prefix:["image/jpg","image/jpeg",]},
    {type:"png",prefix:["image/png"]},
    {type:"gif",prefix:["image/gif"]},
    {type:"bmp",prefix:["image/bmp"]},
    {type:"tiff",prefix:["image/tiff"]},
    {type:"webp",prefix:["image/webp"]},

    //js
    {type:"js",prefix:["text/javascript","application/javascript","application/x-javascript"]},
    {type:"json",prefix:["application/json"]},
    
    //css
    {type:"css",prefix:["text/css"]},

    //audio video

    //font
    {type:"woff",prefix:["application/x-font-woff"]},
    {type:"ttf",prefix:["application/x-font-ttf"]},
    {type:"svg",prefix:["image/svg+xml"]},

    //页面
    {type:"html",prefix:["text/htm","text/html"]},
    {type:"xml",prefix:["text/xml"]},
    {type:"txt",prefix:["text/plain"]}
]


//根据base64数据得到文件类型，
function getContentType(baseData){
    //判断blobType
    for(var i=0;i<typeData.length;i++){
        for(var j=0;j<typeData[i].prefix.length;j++){
             if(baseData.indexOf("data:"+typeData[i].prefix[j])==0 ){
                return typeData[i].type;
            }
        }
    }

    return "";
}

//根据url获取文件名、类型
function getFileName(url){
    var fullname = url;
    fullname=urlFilterProtol(fullname);
    if(fullname.indexOf('?')>0)fullname=fullname.substring(0,fullname.indexOf('?'));//先去除?后面的参数
    

    //根据文件类型保存
    if(fileSaveType==1){
        fullname = fullname.substring(fullname.lastIndexOf('/')+1);//只取最后/后面的名称
        var fileName=fullname;
        var fileType = "";
        if( fullname.lastIndexOf('.') >0){
            fileName=fullname.substring(0,fullname.lastIndexOf('.'));
            fileType = fullname.substring(fullname.lastIndexOf('.')+1);
        }
    }
    else{
        var fileName=fullname;
        var fileType = "";
        //先只取最后/后面的名称，再取文件后缀
        //比如这样 http://movie.douban.com/j/search_tags
        var fullnameTemp = fullname.substring(fullname.lastIndexOf('/')+1);
        if( fullnameTemp.lastIndexOf('.') >0){
            fileName=fullname.substring(0,fullname.lastIndexOf('.'));
            fileType = fullname.substring(fullname.lastIndexOf('.')+1);
        }

    }

    //对于可统译类型的文件，添加后缀html
    return {fullname:fullname,name:fileName,type:fileType};
}

//去除协议头，及最后的斜杠
function urlFilterProtol(url)
{
    if(url.indexOf('?')>0)url=url.substring(0,url.indexOf('?'));//先去除?后面的参数
    url = url.replace("http://","").replace("https://","").replace("file:///","").replace("file://","");
    if(url.lastIndexOf("/")==url.length-1)url=url.substring(0,url.length-1);
    return url;
}

function onerror(message) {
    console.error(message);
}












