//https://github.com/snabbdom/snabbdom#the-style-module
//https://www.cnblogs.com/zhangycun/p/10484867.html
const hooks = ["create", "update", "remove", "destroy", "pre", "post"];
function createRmCb(childElm, listeners) {
	return function rmCb() {
		if (--listeners === 0) {
			const parent = htmlDomApi.parentNode(childElm);
			htmlDomApi.removeChild(parent, childElm);
		}
	};
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
	const map = {};
	for (let i = beginIdx; i <= endIdx; ++i) {
		const key = children[i] && children[i].key;
		if (key !== undefined) {
			map[key] = i;
		}
	}
	return map;
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
	// diff算法

	//   【1】.判断 oldCh 第一个节点元素是不是空的，如果是空的表示 DOM 已经移除，接着进行下一轮比较
	//   【2】.判断 oldCh 最后一个节点元素是不是空的，如果是空的表示 DOM 已经移除，接着进行下一轮比较
	//   【3】.判断 newCh 第一个节点元素是不是空的，如果是空的表示 DOM 已经移除，接着进行下一轮比较
	//   【4】.判断 newCh 最后一个节点元素是不是空的，如果是空的表示 DOM 已经移除，接着进行下一轮比较。
	//   【5】.判断 oldCh 与 newCh 第一个节点元素是不是相同，如果相同我们接着进行下一轮比较
	//   【6】.判断 oldCh 与 newCh 最后一个节点元素是不是相同，如果相同我们接着进行下一轮比较
	//   【7】.判断 oldCh 第一个节点元素与 newCh 的最后一个节点元素是否相同，如果相同，就将oldCh 第一个节点元素进行移动
	//   【8】.判断 oldCh 最后一个节点元素与 newCh 的第一个节点元素是否相同，如果相同，就将oldCh 最后一个节点元素进行移动

	function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
		//算法解析
		//http://qiutianaimeili.com/html/page/2018/05/4si69yn4stl.html
		//https://www.jianshu.com/p/f45463e7be20
		//https://www.cnblogs.com/zhangycun/p/10484867.html
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
		//旧vnode与新vnode比较
		//逐个遍历newVdom的节点，找到它在oldVdom中的位置，如果找到了就移动对应的DOM元素，如果没找到说明是新增节点，则新建一个节点插入。遍历完成之后如果oldVdom中还有没处理过的节点，则说明这些节点在newVdom中被删除了，删除它们即可
		while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
			//1、
			if (oldStartVnode == null) {
				console.log("oldStartVnode==null");
				oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
			} else if (oldEndVnode == null) {
				//2、
				console.log("oldEndVnode==null");
				oldEndVnode = oldCh[--oldEndIdx];
			} else if (newStartVnode == null) {
				//3、
				console.log("newStartVnode==null");
				newStartVnode = newCh[++newStartIdx];
			} else if (newEndVnode == null) {
				//4、
				console.log("newEndVnode==null");
				newEndVnode = newCh[--newEndIdx];
			} else if (sameVnode(oldStartVnode, newStartVnode)) {
				//5、move right
				patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
				oldStartVnode = oldCh[++oldStartIdx];
				newStartVnode = newCh[++newStartIdx];
			} else if (sameVnode(oldEndVnode, newEndVnode)) {
				//6、move left
				//console.log(1);
				patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
				oldEndVnode = oldCh[--oldEndIdx];
				newEndVnode = newCh[--newEndIdx];

				// console.log(
				// 	"oldEndIdx",
				// 	oldEndIdx,
				// 	";newEndIdx:",
				// 	newEndIdx,
				// 	";oldStartIdx;",
				// 	oldStartIdx,
				// 	";oldEndVnode:",
				// 	oldEndVnode,

				// 	";newEndVnode:",
				// 	newEndVnode
				// );
				//console.log(2);
			} else if (sameVnode(oldStartVnode, newEndVnode)) {
				//7、首尾比较
				// Vnode moved right

				// 把获得更新后的 (oldStartVnode/newEndVnode) 的 dom 右移，移动到
				// oldEndVnode 对应的 dom 的右边。为什么这么右移？
				// （1）oldStartVnode 和 newEndVnode 相同，显然是 vnode 右移了。
				// （2）若 while 循环刚开始，那移到 oldEndVnode.elm 右边就是最右边，是合理的；
				// （3）若循环不是刚开始，因为比较过程是两头向中间，那么两头的 dom 的位置已经是
				//     合理的了，移动到 oldEndVnode.elm 右边是正确的位置；
				// （4）记住，oldVnode 和 vnode 是相同的才 patch，且 oldVnode 自己对应的 dom
				//     总是已经存在的，vnode 的 dom 是不存在的，直接复用 oldVnode 对应的 dom。
				patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);

				// function insertBefore (parentNode, newNode, referenceNode) {
				//     parentNode.insertBefore(newNode, referenceNode);
				// }

				htmlDomApi.insertBefore(
					parentElm,
					oldStartVnode.elm,
					htmlDomApi.nextSibling(oldEndVnode.elm)
				);
				oldStartVnode = oldCh[++oldStartIdx];
				newEndVnode = newCh[--newEndIdx];
			} else if (sameVnode(oldEndVnode, newStartVnode)) {
				//8、尾首比较
				console.log(newStartVnode);
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
				console.log(oldKeyToIdx);
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
                    //new start节点在old中没有找到 则新增new start节点 位置在 oldStartVnode 前
					htmlDomApi.insertBefore(
						parentElm,
						createElm(newStartVnode, insertedVnodeQueue),
						oldStartVnode.elm
					);
				} else {
                    // move node
                    console.log(123456)
					elmToMove = oldCh[idxInOld];
					if (elmToMove.sel !== newStartVnode.sel) {
                        //new start节点在old中找到 但不是同类型节点 则新增 new start节点 位置在 oldStartVnode 前
						htmlDomApi.insertBefore(
							parentElm,
							createElm(newStartVnode, insertedVnodeQueue),
							oldStartVnode.elm
						);
					} else {
                        //new start节点在old中找到 并且是同类型节点 则move new start节点 位置在 oldStartVnode 前
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
		//循环结束之后，可能newVdom或者oldVdom中还有未处理的节点，如果是newVdom中有未处理节点，则这些节点是新增节点，做新增处理。
		//如果是oldVdom中有这类节点，则这些是需要删除的节点，相应在DOM树中删除之
		if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
			console.log("end", oldStartIdx, oldEndIdx);
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
		if (oldVnode === vnode) {
			return;
		}
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
			console.log(oldCh, oldVnode.text, vnode.text);
			if (isDef(oldCh)) {
				removeVnodes(elm, oldCh, 0, oldCh.length - 1);
			}
			htmlDomApi.setTextContent(elm, vnode.text);
		}
		hook && hook.postpatch && hook.postpatch(oldVnode, vnode);
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
			insertedVnodeQueue[i].data &&
				insertedVnodeQueue[i].data.hook &&
				insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
		}
		for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
		return vnode;
	};
}
