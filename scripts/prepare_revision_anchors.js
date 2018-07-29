var CONTEXT_CACHE = {};

function isRevisionLink(anchor) {
  var href = anchor.href;
  var text = anchor.textContent;

  return typeof href === 'string'
    && href.includes('riigiteataja.ee/akt')
    && typeof text === 'string'
    && text.includes('RT');
}

function getProtocol(url) {
  var match = /^(https?:\/\/)/i.exec(url);
  if (match.length > 1) {
    return match[1];
  }
}

function trimFirst(s, token) {
  if (s.startsWith(token)) {
    return s.substring(token.length);
  }
  return s;
}

function trimLast(s, token) {
  if (s.endsWith(token)) {
    return s.substring(0, s.length - token.length);
  }
  return s;
}

function downloadUrl(url, cb) {
  document.body.style.cursor = 'wait';
  var _freezeInst = document.freezeUI({text: 'Laen väliseid andmeid'});
  chrome.runtime.sendMessage({type: "downloadUrl", url: url}, function(response) {
    document.body.style.cursor = 'default';
    _freezeInst.unfreeze();
    cb(response);
  });
}

function openUrl(url) {
  window.open(url);
}

function getUrlParts(url) {
  var protocol = getProtocol(url);
  var urlTrimmed = typeof protocol === 'string'
    ? url.replace(protocol, '')
    : url;

  var rootUrl;
  var nCut = urlTrimmed.indexOf('/');
  var rootUrl = nCut > 0
    ? urlTrimmed.substring(0, nCut)
    : urlTrimmed;

  var path = nCut > 0
    ? urlTrimmed.substring(nCut)
    : '';

  return [protocol, trimLast(rootUrl, '/'), '/'+trimFirst(path, '/')];
}

function handleReasonClickEvt(e) {
  e.preventDefault();

  var targetNode = e.target;

  if (targetNode.getAttribute('is-expanded') === 'yes') {
    return;
  }

  var revisionUrl = targetNode.getAttribute('revision-url');
  var contextData = {
    targetNode: targetNode,
    revisionUrl: revisionUrl
  }

  return processRevisionUrl(contextData);
}

function processRevisionUrl(contextData) {
  var revisionUrl = contextData.revisionUrl;

  var rgx = /^(http.+?\.ee)\/akt\/([0-9]+)/g;
  var match = rgx.exec(revisionUrl);

  var rootUrl = match[1];
  var revisionId = match[2];

  if (revisionId in CONTEXT_CACHE) {
    var clonedContext = Object.assign({}, CONTEXT_CACHE[revisionId]);
    clonedContext.targetNode = contextData.targetNode;
    processReasonPageData(clonedContext);
    return;
  }

  var procedureRefUrl = rootUrl+'/akt_seosed.html?vsty=METE&id='+revisionId;
  contextData['revisionId'] = revisionId;
  contextData['procedureRefUrl'] = procedureRefUrl;
  processProcedureRefUrl(contextData);
}

function processProcedureRefUrl(contextData) {
  var procedureRefUrl = contextData.procedureRefUrl;

  downloadUrl(procedureRefUrl, function(response) {
    if (!response.hasError) {
      var tempDoc = document.createElement('html');
      tempDoc.innerHTML = response.data;

      var procedureUrl;
      var anchorList = tempDoc.getElementsByTagName('a');
      for (var i = 0; i < anchorList.length; i++) {
        var anchor = anchorList[i];
        var href = anchor.href;
        // https://www.riigiteataja.ee/eelnoud/menetluskaik/MEM/17-0105
        if (href.includes('/eelnoud/menetluskaik/')) {
          procedureUrl = href;
          break;
        }
      }

      tempDoc = undefined;
      if (typeof procedureUrl === 'undefined')
        return;

      contextData['procedureUrl'] = procedureUrl;
      processProcedureUrl(contextData);
    }
  });
}

function processProcedureUrl(contextData) {
  var procedureUrl = contextData.procedureUrl;

  downloadUrl(procedureUrl, function(response) {
    if (!response.hasError) {
      var tempDoc = document.createElement('html');
      tempDoc.innerHTML = response.data;

      var reasonUrl;
      var anchorList = tempDoc.getElementsByTagName('a');
      for (var i = 0; i < anchorList.length; i++) {
        var anchor = anchorList[i];
        var href = anchor.href;

        if (href.includes('riigikogu.ee/tegevus/eelnoud/eelnou/')
          || (href.includes('page=eelnou') && href.includes('op=ems'))) {
          var parentOfParent = anchor.parentNode.parentNode;
          if (parentOfParent.nodeName !== 'TR')
            continue;

          var tr = parentOfParent;
          var td = tr.firstChild;
          if (!td.textContent.includes('Vastu võetud'))
            continue;

          reasonUrl = href;
          break;
        }
      }

      tempDoc = undefined;
      if (typeof reasonUrl === 'undefined')
        return;

      contextData['reasonUrl'] = reasonUrl;
      processReasonUrl(contextData);
    }
  });
}

function processReasonUrl(contextData) {
  //  openUrl(reasonUrl);
  var reasonUrl = contextData.reasonUrl;

  if (reasonUrl.includes('page=eelnou') && reasonUrl.includes('eid=')) {
    var rgx = /&eid=([a-zA-Z0-9-]+)/g;
    var match = rgx.exec(reasonUrl);

    var eid = match[1];
    reasonUrl = 'https://www.riigikogu.ee/tegevus/eelnoud/eelnou/'+eid;
    contextData.reasonUrl = reasonUrl;
  }

  reasonUrl = reasonUrl.replace('http:', 'https:');
  downloadUrl(reasonUrl, function(response) {
    if (!response.hasError) {
      var tempDoc = document.createElement('html');
      tempDoc.innerHTML = response.data;

      var reasonPageData = {};
      var headerNodes = tempDoc.getElementsByTagName('h2');
      for (var i = 0; i < headerNodes.length; i++) {
        var h2 = headerNodes[i];
        if (h2.textContent.includes('Tekstid')) {
          var table = h2.nextElementSibling;
          if (table.nodeName !== 'TABLE')
            continue;

          reasonPageData['textsInnerHTML'] = table.innerHTML;
          break;
        }
      }

      if (JSON.stringify(reasonPageData) === JSON.stringify({})) {
        return;
      }

      var headerNodes = tempDoc.getElementsByTagName('header');
      for (var i = 0; i < headerNodes.length; i++) {
        var header = headerNodes[i];
        if (header.classList.contains('page-header')) {
          reasonPageData['title'] = header.getElementsByTagName('h1')[0].innerText;
          break;
        }
      }

      contextData['reasonPageData'] = reasonPageData;
      processReasonPageData(contextData);
    }
  });
}

function processReasonPageData(contextData) {
  var reasonPageData = contextData.reasonPageData;
  var containerDiv;

  if ('resultDiv' in contextData)
  {
    containerDiv = contextData.resultDiv.cloneNode(true);
  }
  else
  {
    var textsInnerHTML = reasonPageData.textsInnerHTML;
    var reasonUrl = contextData.reasonUrl;
    var reasonUrlParts = getUrlParts(reasonUrl);

    var textsTable = document.createElement('table');
    textsTable.innerHTML = textsInnerHTML;

    var tableCells = textsTable.getElementsByTagName('td');
    for (var i = 0; i < tableCells.length; i++) {
      var cell = tableCells[i];
      var docListDiv = cell.firstChild;
      if (docListDiv.nodeName !== 'DIV')
        continue;

      var docAnchors = docListDiv.getElementsByTagName('a');
      var cellAnchors = [];

      for (var j = 0; j < docAnchors.length; j++) {
        var docAnchor = docAnchors[j];
        var hrefParts = getUrlParts(docAnchor.href);

        var docAnchorFixed = document.createElement('a');
        docAnchorFixed.innerText = docAnchor.innerText;
        docAnchorFixed.href = reasonUrlParts[0]+reasonUrlParts[1]+hrefParts[2];
        cellAnchors.push(docAnchorFixed);
      }

      var docListUL = document.createElement('ul');
      for (var j = 0; j < cellAnchors.length; j++) {
        var anchor = cellAnchors[j];
        var docListItem = document.createElement('li');
        docListItem.appendChild(anchor);
        docListUL.appendChild(docListItem);
      }

      cell.replaceChild(docListUL, docListDiv);
    }

    var textsTableBody = textsTable.firstElementChild;
    var linkRow = document.createElement('tr');
    var title = 'title' in reasonPageData
      ? reasonPageData.title
      : 'Ava eraldi aknas';
    linkRow.innerHTML = '<td><strong>Allikas</strong></td>'
      + '<td><a target="_blank" href="'+reasonUrl+'">'+title+'</a></td>';

    textsTableBody.insertBefore(linkRow, textsTableBody.firstChild);

    containerDiv = document.createElement('div');
    containerDiv.classList.add('reasonTable');
    var styleDiv = document.createElement('style');
    styleDiv.innerText = '\
      .reasonTable ul { margin: 0; }\
      .reasonTable td { padding: 5px; font-weight: normal; }\
    ';

    containerDiv.appendChild(styleDiv);
    containerDiv.appendChild(textsTable);
  }

  var targetNode = contextData.targetNode;
  var targetParent = targetNode.parentNode;
  var targetGrandparent = targetParent.parentNode;

  targetGrandparent.insertBefore(containerDiv, targetParent.nextSibling);
  targetNode.setAttribute('is-expanded', 'yes');

  var revisionId = contextData.revisionId;
  if (!(revisionId in CONTEXT_CACHE)) {
    contextData['resultDiv'] = containerDiv;
    CONTEXT_CACHE[revisionId] = contextData;
  }
}

function main() {
  var liveAnchorList = document.getElementsByTagName('a');

  var anchors = [];
  for (var i = 0; i < liveAnchorList.length; i++) {
    anchors.push(liveAnchorList[i]);
  }

  for (var i = 0; i < anchors.length; i++) {
    var anchor = anchors[i];
    if (isRevisionLink(anchor)) {
      var revisionUrl = anchor.href;

      // var sep = document.createElement('span');
      // sep.textContent = '\u00a0|\u00a0';
      var sep = document.createTextNode('\u00a0|\u00a0');

      var newAnchor = document.createElement('a');
      newAnchor.href = '#';
      newAnchor.id = '_chrome_ext_reason_anchor_'+i;
      newAnchor.target = '_blank';
      newAnchor.textContent = 'Tekstid';
      newAnchor.setAttribute('revision-url', revisionUrl);
      newAnchor.addEventListener('click', function(e) {
        handleReasonClickEvt(e);
      });

      anchor.parentNode.insertBefore(sep, anchor.nextSibling);
      sep.parentNode.insertBefore(newAnchor, sep.nextSibling);
    }
  }
}

main();
