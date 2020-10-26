const hooks = ["create", "update", "remove", "destroy", "pre", "post"];
function createRmCb(childElm, listeners) {
	return function rmCb() {
		if (--listeners === 0) {
			const parent = htmlDomApi.parentNode(childElm);
			htmlDomApi.removeChild(parent, childElm);
		}
	};
    
}



function createKeyToOldIdx (children, beginIdx, endIdx) {
  const  KeyToIndexMap = {}
  for (let i = beginIdx; i <= endIdx; ++i) {
    const key = children[i] && children[i].key
    if (key !== undefined) {
      map[key] = i
    }
  }
  return map
}

function emptyNodeAt(elm) {
	const id = elm.id ? "#" + elm.id : "";
	const c = elm.className ? "." + elm.className.split(" ").join(".") : "";
	return vnode(
		htmlDomApi.tagName(elm).toLowerCase() + id + c,
		{},
		[],
		undefined,
		elm
	);
}
function init(modules) {
	let i = 0;
	let j = 0;
	const cbs = {
		create: [],
		update: [],
		remove: [],
		destroy: [],
		pre: [],
		post: [],
	};

	//   const htmlDomApi: DOMAPI = domApi !== undefined ? domApi : htmlDomApi

	for (i = 0; i < hooks.length; ++i) {
		cbs[hooks[i]] = [];
		for (j = 0; j < modules.length; ++j) {
			const hook = modules[j][hooks[i]];
			if (hook !== undefined) {
				cbs[hooks[i]].push(hook);
			}
		}
	}



	//vnode =>真实dom

	function createElm(vnode, insertedVnodeQueue) {
		let i,
			data = vnode.data;

		if (data !== undefined) {
			const init = data.hook && data.hook.init;

			if (isDef(init)) {
				init(vnode);
				data = vnode.data;
			}
		}

		const children = vnode.children,
			sel = vnode.sel;

		if (sel === "!") {
			if (isUndef(vnode.text)) {
				vnode.text = "";
			}

			vnode.elm = htmlDomApi.createComment(vnode.text);
		} else if (sel !== undefined) {
			// Parse selector

			const hashIdx = sel.indexOf("#");

			const dotIdx = sel.indexOf(".", hashIdx);
			const hash = hashIdx > 0 ? hashIdx : sel.length;
			const dot = dotIdx > 0 ? dotIdx : sel.length;
			const tag =
				hashIdx !== -1 || dotIdx !== -1
					? sel.slice(0, Math.min(hash, dot))
					: sel;
			const elm = (vnode.elm =
				isDef(data) && isDef((i = data.ns))
					? htmlDomApi.createElementNS(i, tag)
					: htmlDomApi.createElement(tag));

			if (hash < dot) {
				elm.setAttribute("id", sel.slice(hash + 1, dot));
			}
			if (dotIdx > 0)
				elm.setAttribute(
					"class",
					sel.slice(dot + 1).replace(/\./g, " ")
				);

			for (i = 0; i < cbs.create.length; ++i)
				cbs.create[i](emptyNode, vnode);

			if (is.array(children)) {
				for (i = 0; i < children.length; ++i) {
					const ch = children[i];
					if (ch != null) {
						htmlDomApi.appendChild(
							elm,
							createElm(ch, insertedVnodeQueue)
						);
					}
				}
			} else if (is.primitive(vnode.text)) {
				htmlDomApi.appendChild(
					elm,
					htmlDomApi.createTextNode(vnode.text)
				);
			}
			const hook = vnode.data && vnode.data.hook;
			if (isDef(hook)) {
				hook.create && hook.create(emptyNode, vnode);
				if (hook.insert) {
					insertedVnodeQueue.push(vnode);
				}
			}
		} else {
			vnode.elm = htmlDomApi.createTextNode(vnode.text);
		}

		return vnode.elm;

		//return vnode.elm
	}

	function addVnodes(
		parentElm,
		before,
		vnodes,
		startIdx,
		endIdx,
		insertedVnodeQueue
	) {
		for (; startIdx <= endIdx; ++startIdx) {
			const ch = vnodes[startIdx];
			if (ch != null) {
				htmlDomApi.insertBefore(
					parentElm,
					createElm(ch, insertedVnodeQueue),
					before
				);
			}
		}
	}

	function invokeDestroyHook(vnode) {
		const data = vnode.data;
		if (data !== undefined) {
			data && data.hook && data.hook.destroy && data.hook.destroy(vnode);
			for (let i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
			if (vnode.children !== undefined) {
				for (let j = 0; j < vnode.children.length; ++j) {
					const child = vnode.children[j];
					if (child != null && typeof child !== "string") {
						invokeDestroyHook(child);
					}
				}
			}
		}
	}

	function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
		for (; startIdx <= endIdx; ++startIdx) {
			let listeners = 0;
			let rm = () => {};
			const ch = vnodes[startIdx];
			if (ch != null) {
				if (isDef(ch.sel)) {
					invokeDestroyHook(ch);
					listeners = cbs.remove.length + 1;
					rm = createRmCb(ch.elm, listeners);
					for (let i = 0; i < cbs.remove.length; ++i)
						cbs.remove[i](ch, rm);
					const removeHook =
						ch && ch.data && ch.data.hook && ch.data.hook.remove;
					if (isDef(removeHook)) {
						removeHook(ch, rm);
					} else {
						rm();
					}
				} else {
					// Text node
					htmlDomApi.removeChild(parentElm, ch.elm);
				}
			}
		}
	}

	function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
		let oldStartIdx = 0;
		let newStartIdx = 0;
		let oldEndIdx = oldCh.length - 1;
		let oldStartVnode = oldCh[0];
		let oldEndVnode = oldCh[oldEndIdx];
		let newEndIdx = newCh.length - 1;
		let newStartVnode = newCh[0];
		let newEndVnode = newCh[newEndIdx];
		let oldKeyToIdx;
		let idxInOld = 0;
		let elmToMove;
		let before;

		while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
			if (oldStartVnode == null) {
				oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
			} else if (oldEndVnode == null) {
				oldEndVnode = oldCh[--oldEndIdx];
			} else if (newStartVnode == null) {
				newStartVnode = newCh[++newStartIdx];
			} else if (newEndVnode == null) {
				newEndVnode = newCh[--newEndIdx];
			} else if (sameVnode(oldStartVnode, newStartVnode)) {
				patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
				oldStartVnode = oldCh[++oldStartIdx];
				newStartVnode = newCh[++newStartIdx];
			} else if (sameVnode(oldEndVnode, newEndVnode)) {
				patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
				oldEndVnode = oldCh[--oldEndIdx];
				newEndVnode = newCh[--newEndIdx];
			} else if (sameVnode(oldStartVnode, newEndVnode)) {
				// Vnode moved right
				patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
				htmlDomApi.insertBefore(
					parentElm,
					oldStartVnode.elm,
					htmlDomApi.nextSibling(oldEndVnode.elm)
				);
				oldStartVnode = oldCh[++oldStartIdx];
				newEndVnode = newCh[--newEndIdx];
			} else if (sameVnode(oldEndVnode, newStartVnode)) {
				// Vnode moved left
				patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
				htmlDomApi.insertBefore(
					parentElm,
					oldEndVnode.elm,
					oldStartVnode.elm
				);
				oldEndVnode = oldCh[--oldEndIdx];
				newStartVnode = newCh[++newStartIdx];
			} else {
				if (oldKeyToIdx === undefined) {
					oldKeyToIdx = createKeyToOldIdx(
						oldCh,
						oldStartIdx,
						oldEndIdx
					);
				}
				idxInOld = oldKeyToIdx[newStartVnode.key];
				if (isUndef(idxInOld)) {
					// New element
					htmlDomApi.insertBefore(
						parentElm,
						createElm(newStartVnode, insertedVnodeQueue),
						oldStartVnode.elm
					);
				} else {
					elmToMove = oldCh[idxInOld];
					if (elmToMove.sel !== newStartVnode.sel) {
						htmlDomApi.insertBefore(
							parentElm,
							createElm(newStartVnode, insertedVnodeQueue),
							oldStartVnode.elm
						);
					} else {
						patchVnode(
							elmToMove,
							newStartVnode,
							insertedVnodeQueue
						);
						oldCh[idxInOld] = undefined;
						htmlDomApi.insertBefore(
							parentElm,
							elmToMove.elm,
							oldStartVnode.elm
						);
					}
				}
				newStartVnode = newCh[++newStartIdx];
			}
		}
		if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
			if (oldStartIdx > oldEndIdx) {
				before =
					newCh[newEndIdx + 1] == null
						? null
						: newCh[newEndIdx + 1].elm;
				addVnodes(
					parentElm,
					before,
					newCh,
					newStartIdx,
					newEndIdx,
					insertedVnodeQueue
				);
			} else {
				removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
			}
		}
	}

	function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
		const hook = vnode.data && vnode.data.hook;
		hook && hook.prepatch && hook.prepatch(oldVnode, vnode);
		const elm = (vnode.elm = oldVnode.elm);
		const oldCh = oldVnode.children;
		const ch = vnode.children;
		if (oldVnode === vnode) return;
		if (vnode.data !== undefined) {
			for (let i = 0; i < cbs.update.length; ++i)
				cbs.update[i](oldVnode, vnode);
			vnode.data.hook &&
				vnode.data.hook.update &&
				vnode.data.hook.update(oldVnode, vnode);
		}
		if (isUndef(vnode.text)) {
			if (isDef(oldCh) && isDef(ch)) {
				if (oldCh !== ch)
					updateChildren(elm, oldCh, ch, insertedVnodeQueue);
			} else if (isDef(ch)) {
				if (isDef(oldVnode.text)) htmlDomApi.setTextContent(elm, "");
				addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
			} else if (isDef(oldCh)) {
				removeVnodes(elm, oldCh, 0, oldCh.length - 1);
			} else if (isDef(oldVnode.text)) {
				htmlDomApi.setTextContent(elm, "");
			}
		} else if (oldVnode.text !== vnode.text) {
			if (isDef(oldCh)) {
				removeVnodes(elm, oldCh, 0, oldCh.length - 1);
			}
			htmlDomApi.setTextContent(elm, vnode.text);
		}
		hook && hook.postpatch && hook.post.patch(oldVnode, vnode);
	}

	return function patch(oldVnode, vnode) {
		let i = 0,
			elm,
			parent;
		const insertedVnodeQueue = [];
		for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

		if (!isVnode(oldVnode)) {
			oldVnode = emptyNodeAt(oldVnode);
		}

		if (sameVnode(oldVnode, vnode)) {
			patchVnode(oldVnode, vnode, insertedVnodeQueue);
		} else {
			elm = oldVnode.elm;
			parent = htmlDomApi.parentNode(elm);

			createElm(vnode, insertedVnodeQueue);

			if (parent !== null) {
				htmlDomApi.insertBefore(
					parent,
					vnode.elm,
					htmlDomApi.nextSibling(elm)
				);
				removeVnodes(parent, [oldVnode], 0, 0);
			}
		}

		for (i = 0; i < insertedVnodeQueue.length; ++i) {
		    insertedVnodeQueue[i].data&&insertedVnodeQueue[i].data.hook&&insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i])
		}
		for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
		return vnode;
	};
}
