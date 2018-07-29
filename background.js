chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.type === 'downloadUrl') {
          downloadUrl(request.url, function(statusCode, statusText, responseText, xhr) {
            if (statusCode == 200) {
              sendResponse({hasError: false, data: responseText});
            } else {
              sendResponse({hasError: true, data: {
                statusCode: statusCode,
                statusText: statusText,
                responseText: responseText,
                xhr: xhr,
                targetUrl: request.url
              }});
            }
          });

          return true;
        }

        return false;
    }
);
