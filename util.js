const htmlDomApi = {
	createElement(tagName) {
		return document.createElement(tagName);
	},
	createElementNS(namespaceURI, qualifiedName) {
		return document.createElementNS(namespaceURI, qualifiedName);
	},
	createTextNode(text) {
		return document.createTextNode(text);
	},
	createComment(text) {
		return document.createComment(text);
	},
	insertBefore(parentNode, newNode, referenceNode) {
		parentNode.insertBefore(newNode, referenceNode);
	},
	removeChild(node, child) {
		node.removeChild(child);
	},
	appendChild(node, child) {
		node.appendChild(child);
	},
	parentNode(node) {
		return node.parentNode;
	},
	nextSibling(node) {
		return node.nextSibling;
	},
	tagName(elm) {
		return elm.tagName;
	},
	setTextContent(node, text) {
		node.textContent = text;
	},
	getTextContent(node) {
		return node.textContent;
	},
	isElement(node) {
		return node.nodeType === 1;
	},
	isText(node) {
		return node.nodeType === 3;
	},
	isComment(node) {
		return node.nodeType === 8;
	},
};

const is = {
	array: Array.isArray,
	primitive(s) {
		return typeof s === "string" || typeof s === "number";
	},
};

function isUndef(s) {
	return s === undefined;
}
function isDef(s) {
	return s !== undefined;
}

function isVnode(vnode) {
	return vnode.sel !== undefined;
}

function sameVnode (vnode1, vnode2) {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel
}
