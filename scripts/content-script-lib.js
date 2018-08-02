function selectSingleNode(xpath, docObject, docNode) {
  docObject = docObject || document;
  docNode = docNode || docObject;

  return docObject.evaluate(
      xpath,
      docNode,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
     ).singleNodeValue;
}

function selectNodes(xpath, docObject, docNode) {
  docObject = docObject || document;
  docNode = docNode || docObject;

  return docObject.evaluate(
    xpath,
    docNode,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null);
}
