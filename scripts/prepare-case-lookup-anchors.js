function extractAcronym() {
  var header = selectSingleNode("//h1[contains(text(), 'lühend')]");
  if (header) {
    var headerText = header.textContent;
    var acronymRegex = /\(lühend\s-\s(.+?)\)/i;
    var match = acronymRegex.exec(headerText);
    if (match)
      return match[1];
  }
}

function buildUrl(root, path, params) {
  var url = root+path;

  var paramString = '';
  if (typeof params === 'object') {
    var paramNames = Object.keys(params);
    for (var i = 0; i < paramNames.length; i++) {
      var paramName = paramNames[i];
      if (i == 0) {
        paramString = paramName+'='+params[paramName];
      } else {
        paramString = paramString+'&'+paramName+'='+params[paramName];
      }
    }
  } else if (typeof params === 'string') {
    paramString = params;
  }

  url = url+'?'+paramString;
  return encodeURI(url);
}

function getCaseLookupUrl(acronym, paragraphNr, sectionNr, itemNr) {
  var query = '';
  var params = {
    'sortVaartus': 'LahendiKuulutamiseAeg',
    'sortAsc': false,
    'kuvadaVaartus': 'Pealkiri',
    'pageSize': 25,
    'defaultPageSize': 25
  }

  var rootUrl = 'https://rikos.rik.ee';
  var path = '/'

  var textQuery = acronym+' § '+paragraphNr;
  if (sectionNr) {
    textQuery = textQuery+' lg '+sectionNr;
    if (itemNr) {
      textQuery = textQuery+' p '+itemNr;
    }
  }

  params['tekst'] = textQuery;
  return { query: textQuery, url: buildUrl(rootUrl, path, params) };
}

var NodeTypes = {
  PARAGRAPH: 'PARAGRAPH',
  SECTION: 'SECTION',
  ITEM: 'ITEM'
}

function parseCodeString(codeString) {
  var result = {nodeType: undefined};
  var keys = ['paragraphNr', 'sectionNr', 'itemNr'];
  var regexes = [/para([0-9]+)/i, /lg([0-9]+)/i, /p([0-9]+)/i];
  var types = [NodeTypes.PARAGRAPH, NodeTypes.SECTION, NodeTypes.ITEM];

  for (var i = 0; i < regexes.length; i++) {
    var match = regexes[i].exec(codeString);
    if (!match)
      break;

    result['nodeType'] = types[i];
    result[keys[i]] = parseInt(match[1]);
  }

  return result;
}

function createCaseLookupLink(acronym, node, codeData) {
  var codeParts = typeof codeData === 'string'
    ? parseCodeString(codeData)
    : codeData;
  var caseLookupData = getCaseLookupUrl(acronym, codeParts.paragraphNr, codeParts.sectionNr, codeParts.itemNr);
  var caseLookupUrl = caseLookupData.url;
  var hoverLabel = caseLookupData.query;

  var onClick = function(e) {
    e.preventDefault();

    var width = window.innerWidth * 0.66 ;
    var height = width * (window.innerHeight / window.innerWidth);
    var topOffset = ((window.innerHeight - height) / 2);
    var leftOffset = ((window.innerWidth - width) / 2);

    var strUrl = caseLookupUrl;
    var windowName = 'CaseLookup'; // use '_blank' to open completely new window
    var windowFeatures = 'width='+width+',height='+height+',top='+topOffset+',left='+leftOffset;

    window.open(strUrl, windowName, windowFeatures);

    return false;
  };

  var lookupAnchor = document.createElement('a');
  lookupAnchor.href = caseLookupUrl;
  lookupAnchor.target = '_blank';
  lookupAnchor.onclick = onClick;
  lookupAnchor.title = hoverLabel;

  switch (codeParts.nodeType) {
  case NodeTypes.PARAGRAPH:
    var paragraphNode = node.previousSibling;
    var paragraphTextNode = paragraphNode.firstChild;

    lookupAnchor.textContent = paragraphTextNode.textContent;

    paragraphTextNode.parentNode.insertBefore(lookupAnchor, paragraphTextNode);
    paragraphTextNode.parentNode.removeChild(paragraphTextNode);
    break;
  case NodeTypes.SECTION:
  case NodeTypes.ITEM:
    var nextTextNode = node.nextSibling;
    var textContent = nextTextNode.textContent;
    var numerationRegex = /^(\([0-9]+\)|[0-9]+\))/i;
    var match = numerationRegex.exec(textContent);

    if (match) {
      var numerationText = match[1];
      textContent = textContent.substring(numerationText.length);
      nextTextNode.textContent = textContent;
      lookupAnchor.textContent = numerationText;
      nextTextNode.parentNode.insertBefore(lookupAnchor, nextTextNode);
    }

    break;
  default:
    break;
  }
}

function createCaseLookupLinks(acronym) {
  var lawNodes = selectNodes("//a[starts-with(@name, 'para')]");
  for (var i = 0; i < lawNodes.snapshotLength; i++) {
    var lawNode = lawNodes.snapshotItem(i);
    var lawCode = lawNode.name;
    createCaseLookupLink(acronym, lawNode, lawCode);
  }
}

function createCaseLookupLinksForOldLayout(acronym) {
  var headerNodes = selectNodes("//h3[count(.//a[starts-with(@name, 'para')]) > 0]");
  var createCaseLookupLinkArgs = [];

  for (var i = 0; i < headerNodes.snapshotLength; i++) {
    var headerNode = headerNodes.snapshotItem(i);
    var paragraphNode = selectSingleNode("./a[starts-with(@name, 'para')]", document, headerNode);
    var regex = /§ ([0-9]+)\./i;
    var match = regex.exec(paragraphNode.previousSibling.textContent);
    var paragraphNr;
    if (!match) {
      continue;
    }
    paragraphNr = match[1];

    createCaseLookupLinkArgs.push([acronym, paragraphNode, {
      nodeType: NodeTypes.PARAGRAPH,
      paragraphNr: paragraphNr}]);

    var sectionNr = 1;
    var pNode = headerNode.nextSibling;
    while (pNode && pNode.nodeName === 'P') {
      var sectionNode = pNode.firstChild;

      if (!sectionNode) {
        break;
      }

      createCaseLookupLinkArgs.push([acronym, sectionNode, {
        nodeType: NodeTypes.SECTION,
        paragraphNr: paragraphNr,
        sectionNr: sectionNr}]);

      var itemNodes = selectNodes("./a[string-length(@name) = 0][string-length(@href) = 0][string-length(text()) = 1]", document, pNode);
      var itemNr = 1;
      for (var j = 0; j < itemNodes.snapshotLength; j++) {
        var itemNode = itemNodes.snapshotItem(j);

        createCaseLookupLinkArgs.push([acronym, itemNode, {
          nodeType: NodeTypes.ITEM,
          paragraphNr: paragraphNr,
          sectionNr: sectionNr,
          itemNr: itemNr}]);

        itemNr = itemNr + 1;
      }

      sectionNr = sectionNr + 1;
      pNode = pNode.nextSibling;
    }
  }

  for (var i = 0; i < createCaseLookupLinkArgs.length; i++) {
    createCaseLookupLink.apply(this, createCaseLookupLinkArgs[i]);
  }
}

function hasOldLayout() {
  return typeof selectSingleNode("//a[starts-with(@name, 'lg')]") === 'object';
}

function main() {
  var acronym = extractAcronym();

  if (typeof acronym !== 'string') {
    console.warn('Acronym for law not found');
    return;
  }

  if (!hasOldLayout()) {
    createCaseLookupLinks(acronym);
  } else {
    console.warn('Old law layout detected!');
    createCaseLookupLinksForOldLayout(acronym);
  }
}

main();
