const emptyNode = vnode("", {}, [], undefined, undefined);

function vnode(sel, data, children, text, elm) {
	const key = data === undefined ? undefined : data.key;
	return { sel, data, children, text, elm, key };
}

function toVNode(node) {
	let text;
	if (htmlDomApi.isElement(node)) {
		const id = node.id ? "#" + node.id : "";
		const cn = node.getAttribute("class");
		const c = cn ? "." + cn.split(" ").join(".") : "";
		const sel = htmlDomApi.tagName(node).toLowerCase() + id + c;
		const attrs = {};
		const children = [];
		let name = "";
		let i = 0,
			n = 0;
		const elmAttrs = node.attributes;
		const elmChildren = node.childNodes;
		for (i = 0, n = elmAttrs.length; i < n; i++) {
			name = elmAttrs[i].nodeName;
			if (name !== "id" && name !== "class") {
				attrs[name] = elmAttrs[i].nodeValue;
			}
		}
		for (i = 0, n = elmChildren.length; i < n; i++) {
			children.push(toVNode(elmChildren[i]));
		}
		return vnode(sel, { attrs }, children, undefined, node);
	} else if (htmlDomApi.isText(node)) {
		text = htmlDomApi.getTextContent(node);
		return vnode(undefined, undefined, undefined, text, node);
	} else if (htmlDomApi.isComment(node)) {
		text = htmlDomApi.getTextContent(node);
		return vnode("!", {}, [], text, node);
	} else {
		return vnode("", {}, [], undefined, node);
	}
}


function addNS(data, children, sel) {
	data.ns = "http://www.w3.org/2000/svg";
	if (sel !== "foreignObject" && children !== undefined) {
		for (let i = 0; i < children.length; ++i) {
			const childData = children[i].data;
			if (childData !== undefined) {
				addNS(childData, children[i].children, children[i].sel);
			}
		}
	}
}
//h 生成vnode
function h(sel, b, c) {
	var data = {},
		children,
		text,
		i = 0;

	if (c !== undefined) {
		if (b !== null) {
			data = b;
		}

		if (is.array(c)) {
			children = c;
		} else if (is.primitive(c)) {
			text = c;
		} else if (c && c.sel) {
			children = [c];
		}
	} else if (b !== undefined && b !== null) {
		if (is.array(b)) {
			children = b;
		} else if (is.primitive(b)) {
			text = b;
		} else if (b && b.sel) {
			children = [b];
		} else {
			data = b;
		}
	}

	if (children !== undefined) {
		for (i = 0; i < children.length; ++i) {
			if (is.primitive(children[i])) {
				children[i] = vnode(
					undefined,
					undefined,
					undefined,
					children[i],
					undefined
				);
			}
		}
	}
	// 针对svg的node进行特别的处理
	if (
		sel[0] === "s" &&
		sel[1] === "v" &&
		sel[2] === "g" &&
		(sel.length === 3 || sel[3] === "." || sel[3] === "#")
	) {
		addNS(data, children, sel);
	}
	return vnode(sel, data, children, text, undefined);
}

// var vnode_1 = h("div#container2.two.classes", { style: { color: "#000" } }, [
// 	h("h1", "Headline"),
// 	h("p", "A paragraph"),
// ]);
