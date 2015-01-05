/*
 * Copy Right: Tencent ISUX
 * Comments: web下载插件
 * Author: kundy
 * Date: 2014-12-24
 */


const tab_log = function(json_args) {
  var args = JSON.parse(unescape(json_args));
  console[args[0]].apply(console, Array.prototype.slice.call(args, 1));
}


var taskFlag = 0;

//消息处理 start
chrome.extension.onConnect.addListener(function (port) {
    // console.log("onConnect",port);
    var extensionListener = function (message, sender, sendResponse) {
    	if(message.method && message.tabId && message.taskName){


    		if (message.method == 'sendToConsole'){
                return;
    			//输出到background的调试窗口
    			console.log( unescape(message.args) );
    			//输出到当前已选择的tab的窗口
    			chrome.tabs.executeScript(message.tabId, {
    			    code: "("+ tab_log + ")('" + message.args + "');",
    			});
		    }
        	else if(message.method=="taskStart"){
                if(taskFlag)
                    port.postMessage({method:"taskStart",tabId:message.tabId,content:1});
                else{
                    port.postMessage({method:"taskStart",tabId:message.tabId,content:0});
                    taskFlag = 1;
                }
            }
            else if(message.method=="taskFinish"){
                taskFlag = 0;
                port.postMessage({method:"taskFinish",tabId:message.tabId});
            }
            else if(message.method=="getSelectedTab"){
        		chrome.tabs.get(message.content*1,function(tab) {
    				port.postMessage({method:"getSelectedTab",tabId:message.tabId,url:tab.url});
    			});
        		
        	}
        	else if(message.method=="checkTabStatus"){
        		port.postMessage({method:"checkTabStatus",tabId:message.tabId,content:tabStatus});
        	}
        	else if(message.method=="tabStatusInit"){
        		tabStatusInit();
        	}
        	else if(message.method=="reloadTab"){
        		reloadTab();
        	}
        	else if(message.method=="downloadFilelist"){
        		Download.init(message.content);
        	}
        	else if(message.method=="checkDownloadStatus"){
        		var fileDownloadFinish = 0;
    	        var fileDownloadFail = 0;
    	        for(var i=0;i<filelist.length;i++){
    	            if(filelist[i][1]==1)fileDownloadFinish++;
    	            if(filelist[i][1]==2)fileDownloadFail++;
    	        }
    	        
                //下载完了所有文件，打印看一下
    	        if(fileDownloadFinish+fileDownloadFail == filelist.length && 0){
                    console.log(filelist);
                    for(var i =0;i<filelist.length;i++){
                        if(filelist[i][1]==1){
                            console.log(filelist[i][0]);
                            console.log(filelist[i][3].substring(0,30));
                        }
                    }
                }
        		port.postMessage({method:"checkDownloadStatus",tabId:message.tabId,success:fileDownloadFinish,fail:fileDownloadFail});
        	}
        	else if(message.method=="getFileData"){
    	        var fileData = "";
    	        if(filelist[message.content*1][1] == 1){
    	        	fileData = filelist[message.content*1][3];
    	        }
        		port.postMessage({method:"getFileData",
                                    tabId:message.tabId,
    				    			i:message.content,
    				    			status:filelist[message.content*1][1],
    				    			data:fileData});
        	}
        }
	}



    chrome.extension.onMessage.addListener(extensionListener);
    port.onDisconnect.addListener(function(port) {
        // console.log("onDisconnect",port);
        taskFlag = 0;
        chrome.extension.onMessage.removeListener(extensionListener);
    });
});


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    return true;
});

//消息处理 end



//重写webRequest的header字段
//Cache-Control Pragma
// chrome.webRequest.onBeforeSendHeaders.addListener(
//     function(details) {
//     	    // console.log(details);
//             var exists = false;
//             // details.requestHeaders.push({name:"X-Requested-With",value:"XMLHttpRequest"})
//             details.requestHeaders.push({name:"Cache-Control",value:"no-cache"})
//             details.requestHeaders.push({name:"Pragma",value:"no-cache"})

//             // for (var i = 0; i < details.requestHeaders.length; ++i) {
//             //     if (details.requestHeaders[i].name === 'Referer') {
//             //         exists = true;
//             //         details.requestHeaders[i].value = 'http://2014.zhihu.com';
//             //         break;
//             //     }
//             // }
//             // if (!exists) {
//             //  details.requestHeaders.push({ name: 'Referer', value: 'http://2014.zhihu.com'});
//             // }

//             return { requestHeaders: details.requestHeaders };
//     },
//     {urls: ["<all_urls>"]},
//     ["blocking", "requestHeaders"]
// );

var selectedTabId = 0;
var selectedTabUrl="";
var filelist;
var tabStatus = 0;


//刷新当前页面
function reloadTab() {
	tabStatus = 1;
	chrome.tabs.getSelected(null, function(tab) {
              chrome.tabs.reload(tab.id, {bypassCache: true}, function() {
  		});
        });
}


//标签页初始化，tab刷新状态触发tabStatus变化
function tabStatusInit(){
	tabStatus = 0;

	chrome.tabs.getSelected(null, function(tab) {
	    tabId=tab.id;
	    // console.log("tabs getSelected tabId:"+tabId);
	    chrome.tabs.onUpdated.addListener(function(updateTabId, changeInfo, tab) {

	        if(updateTabId != tabId)return;
	        // console.log("tabs onUpdated tabId:"+tabId);
	        if (changeInfo.status === "complete" && tab.status === "complete") {
	            setTimeout(function() {
	            	tabStatus = 2;
	            	// console.log("tabLoadingComplete");
	            	// bgSendRequest("tabLoadingComplete","")
	                // if(downloadStatus=enumStatus.doing)Download.ready();
	            }, 1000);
	        }
	    });
	});
}



 // BEGIN: UTILITY FUNCTIONS
var Download =function(){ }

Download.init=function(list)
{
    filelist = [];
	filelist = JSON.parse(list);
	for(var i=0;i<filelist.length;i++){
		Download.start(i);
	}
}

Download.start=function(i)
{
    if(filelist.length==0)return;//filelist为空时直接退出
    var blobURL = filelist[i][0];
    var xhr = new XMLHttpRequest();    
    xhr.open("get", blobURL, true);
    xhr.responseType = "blob";
    xhr.timeout = 10*1000;
    // xhr.setRequestHeader("User-Agent","Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)");


    xhr.onload = function() {
        if (xhr.status == 200 ) {
            var blobFile = xhr.response;
            if(blobFile.size>0){
                // console.log("Download success i:"+ i +　" blobURL:" +blobURL);
	            var reader = new FileReader();
				reader.onload = function(event){
					filelist[i][3] = event.target.result;
					filelist[i][1]=1;
				}; 
				var source = reader.readAsDataURL(blobFile);
            }
            else{
                // console.warn("Download.size:0 i:"+ i +　" blobURL:" +blobURL);
                Download.fail(i);    
            }
        }
        else{
            // console.warn("Download.fail i:"+ i +　" blobURL:" +blobURL);
            Download.fail(i);
        }
    }
    xhr.ontimeout  = function(event){
        // console.warn("Download.timeout i:"+ i +　" blobURL:" +blobURL);
        Download.fail(i);
　　}
    xhr.onerror = function(e) {
        // console.warn("Download.error i:"+ i +　" blobURL:" +blobURL);
        Download.fail(i);
      };
    xhr.send();
}


 //文件下载失败
Download.fail=function(i){
    filelist[i][1]=2;
}


//文件下载完成
Download.finish=function(i){

    filelist[i][1]=1;
    return;


    var fileDownloadFinish = 0;
    for(var i=0;i<filelist.length;i++){
        if(filelist[i][1]>0)fileDownloadFinish++;
    }
    $("#downloadStatus2").html("文件下载完成，开始打包");
    // if(fileDownloadFinish == filelist.length)ZipFile.add(0);
}

















