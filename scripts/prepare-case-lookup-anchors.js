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
  return buildUrl(rootUrl, path, params);
}

var NodeTypes = {
  PARAGRAPH: 'PARAGRAPH',
  SECTION: 'SECTION',
  ITEM: 'ITEM'
}

function parseCodeString(codeString) {
  var result = {};
  var keys = ['paragraphNr', 'sectionNr', 'itemNr'];
  var regexes = [/\para([0-9]+)/i, /\lg([0-9]+)/i, /\p([0-9]+)/i];

  for (var i = 0; i < regexes.length; i++) {
    var match = regexes[i].exec(codeString);
    if (!match)
      break;
    result[keys[i]] = parseInt(match[1]);
  }

  return result;
}

function createCaseLookupLink(nodeType, node, codeString, acronym) {
  // TODO: unfinished
   var codeParts = parseCodeString(codeString);
   var caseLookupUrl = getCaseLookupUrl(acronym, codeParts.paragraphNr, codeParts.sectionNr, codeParts.itemNr);

  switch (nodeType) {
    case NodeTypes.PARAGRAPH:
      var paragraphNode = node.previousSibling;
      // Wrap paragraph <strong> with anchor
      break;
    case NodeTypes.SECTION:
    case NodeTypes.ITEM:
      var nextTextNode = node.nextSibling;
      // Remove 1) or (1) from text content
      // Prepend anchor node with 1) or (1)
      break;
    default:
      break;
  }
}

function createCaseLookupLinks(acronym) {
  var baseParagraphNodes = selectNodes("//a[starts-with(@name, 'para')][not(contains(@name, 'lg'))]");
  for (var i = 0; i < baseParagraphNodes.snapshotLength; i++) {
    var paragraphNode = baseParagraphNodes.snapshotItem(i);
    var paragraphCode = paragraphNode.name;
    createCaseLookupLink(NodeTypes.PARAGRAPH, paragraphNode, paragraphCode, acronym);

    var sectionNodes = selectNodes("//a[starts-with(@name, '"+paragraphCode+"')][@name != '"+paragraphCode+"'][not(contains(substring-after(@name, 'para'), 'p'))]");
    for (var j = 0; j < sectionNodes.snapshotLength; j++) {
      var sectionNode = sectionNodes.snapshotItem(j);
      var sectionCode = sectionNode.name;
      createCaseLookupLink(NodeTypes.SECTION, sectionNode, sectionCode, acronym);

      var itemNodes = selectNodes("//a[starts-with(@name, '"+sectionCode+"')][@name != '"+sectionCode+"']");
      for (var k = 0; k < itemNodes.snapshotLength; k++) {
        var itemNode = itemNodes.snapshotItem(k);
        var itemCode = itemNode.name;
        createCaseLookupLink(NodeTypes.ITEM, itemNode, itemCode, acronym);
      }
    }
  }
}

function main() {
  var acronym = extractAcronym();

  if (typeof acronym !== 'string') {
    console.warn('Acronym for law not found');
    return;
  }

  createCaseLookupLinks(acronym);
}

main();