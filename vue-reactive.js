function def(obj, key, val, enumerable = true) {
	Object.defineProperty(obj, key, {
		value: val,
		enumerable: !!enumerable,
		writable: true,
		configurable: true,
	});
}

let uid = 0;

function isObject(obj) {
	return Object.prototype.toString.call(obj) === "[object Object]";
}

function hasOwn(obj, key) {
	return Object.keys(obj).some((okey) => okey === key);
}

class MVVM {
	constructor(data) {
		this._data = data;

		Object.keys(data).forEach((key) => {
			this._proxy(key);
		});

		observe(data, this);
	}

	_proxy(key) {
		var vm = this;
		Object.defineProperty(vm, key, {
			configurable: true,
			enumerable: true,
			get: function proxyGetter() {
				return vm._data[key];
			},
			set: function proxySetter(newVal) {
				vm._data[key] = newVal;
			},
		});
	}
}

function observe(value) {
	if (!isObject(value)) return;

	let ob;
	ob = new Observer(value);
	return ob;
}

class Observer {
	constructor(value) {
		this.value = value;
		this.dep = new Dep();

		if (!Array.isArray(value)) this.walk(value);
	}

	walk(obj) {
		const keys = Object.keys(obj);
		for (let index = 0; index < keys.length; index++) {
			defineReactive(obj, keys[index]);
		}
	}
}

class Dep {
	constructor() {
		this.id = uid++;
		this.subs = [];
	}

	addSub(sub) {
		this.subs.push(sub);
	}

	removeSub(sub) {
		let i = -1;
		for (let index = 0; index < this.subs.length; index++) {
			if (this.subs[index] === sub) {
				i = index;
			}
		}

		this.subs.splice(i, 1);
	}

	depend() {
		if (Dep.target) {
			Dep.target.addDep(this);
		}
	}

	notify() {
		const subs = this.subs.slice();
		subs.sort((a, b) => a.id - b.id);
		for (let i = 0, l = subs.length; i < l; i++) {
			subs[i].update();
		}
	}
}
// Dep.target 是 watcher 实例

Dep.target = null;
const targetStack = [];

function pushTarget(target) {
	targetStack.push(target);
	Dep.target = target;
}

function popTarget() {
	targetStack.pop();
	Dep.target = targetStack[targetStack.length - 1];
}

function defineReactive(obj, key, val) {
	const dep = new Dep();
	let childOb = observe(val);
	if (arguments.length === 2) {
		val = obj[key];
	}
	Object.defineProperty(obj, key, {
		enumerable: true,
		configurable: true,
		get: function reactiveGetter() {
			if (Dep.target) {
				dep.depend();
				if (childOb) {
					childOb.dep.depend();
				}
			}
			return val;
		},
		set: function reactiveSetter(newVal) {
			const value = val;
			if (newVal === value || (newVal !== newVal && value !== value)) {
				return;
			}

			val = newVal;

			console.log(newVal);

			//childOb = observe(newVal);
			dep.notify();
		},
	});
}
//Dep是watcher实例的管理者。类似观察者模式的实现。
class Watcher {
	constructor(vm, cb) {
		this.vm = vm;
		this.cb = cb;
		this.id = ++uid; // uid for batching
		this.deep = true;
		this.deps = [];
		this.newDeps = [];
		this.depIds = new Set();
		this.newDepIds = new Set();
		this.get();
	}
	get() {
		pushTarget(this);
		let value;
		const vm = this.vm;
		try {
			value = this.getter.call(vm, vm);
		} catch (e) {
			if (this.user) {
				handleError(e, vm, `getter for watcher "${this.expression}"`);
			} else {
				throw e;
			}
		} finally {
			// "touch" every property so they are all tracked as
			// dependencies for deep watching
			// if (this.deep) {
			// 	//traverse(value);
			// }
			popTarget();
			this.cleanupDeps();
		}
		return value;
	}

	/**
	 * Clean up for dependency collection.
	 */
	cleanupDeps() {
		let i = this.deps.length;
		while (i--) {
			const dep = this.deps[i];
			if (!this.newDepIds.has(dep.id)) {
				dep.removeSub(this);
			}
		}
		let tmp = this.depIds;
		this.depIds = this.newDepIds;
		this.newDepIds = tmp;
		this.newDepIds.clear();
		tmp = this.deps;
		this.deps = this.newDeps;
		this.newDeps = tmp;
		this.newDeps.length = 0;
	}

	addDep(dep) {
		const id = dep.id;

		dep.addSub(this);
		// if (!this.newDepIds.has(id)) {
		// 	this.newDepIds.add(id);
		// 	this.newDeps.push(dep);
		// 	if (!this.depIds.has(id)) {
		// 		dep.addSub(this);
		// 	}
		// }
	}

	update() {
		this.run();
	}
	run() {
		if (this.active) {
			const value = this.get();
			if (
				value !== this.value ||
				// Deep watchers and watchers on Object/Arrays should fire even
				// when the value is the same, because the value may
				// have mutated.
				isObject(value) ||
				this.deep
			) {
				// set new value
				const oldValue = this.value;
				this.value = value;

				this.cb.call(this.vm, value, oldValue);
			}
		}
	}
}


function initWatch (vm, watch) {
    // 这里的 watch 参数， 就是我们 定义的 watch 选项
    // 我们定义的 watch选项 是一个 Object，所以要用 for...in 循环遍历它。
    for (const key in watch) {
        // key 就是我们要 watch 的值的名称
        const handler = watch[key]
        // 如果 是这种调用方式 key: [xxx, xxx]
        if (Array.isArray(handler)) {
            for (let i = 0; i < handler.length; i++) {
            createWatcher(vm, key, handler[i])
        }
        } else {
            createWatcher(vm, key, handler)
        }
  }
}

function createWatcher (vm, expOrFn,handler, options) {
    // 如果 handler 是一个对象， 如：key: { handler: 'methodName', deep: true } 这种方式调用
    // 将 handler.handler 赋值给 handler，也就是说 handler 的值会被覆盖 为 'methodName'
    if (isPlainObject(handler)) {
        options = handler
        handler = handler.handler
    }
    // 如果handler 是一个字符串，则 从 vm 对象上去获取函数，赋值给 handler
    if (typeof handler === 'string') {
        handler = vm[handler]
    }
    
    return vm.$watch(expOrFn, handler, options)
}

MVVM.prototype.$watch = function (
    expOrFn,
    cb,
    options
){
    const vm = this
    
    // 如果回调是对象的话，调用 createWatcher 将参数规范化, createWatcher 内部再调用 vm.$watch 进行处理。
    if (isPlainObject(cb)) {
        return createWatcher(vm, expOrFn, cb, options)
    }
    
    options = options || {}
    
    // 设置 user 默认值 为 true，刚才我们分析的 Watcher 类，它的 run 方法里面就有关于 user 的判断
    options.user = true
    
    // 初始化 watcher
    const watcher = new Watcher(vm, expOrFn, cb, options)
    
    // 如果 immediate 为true， 立即触发一次回调
    if (options.immediate ) {
          cb.call(vm, watcher.value)
    }
    
    // 返回一个函数，可以用来取消 watch
    return function unwatchFn () {
        watcher.teardown()
    }

}


const tempDt = {
	age: 29,
	params: {
		name: "jiangsuiting",
	},
};
// var data1 = observe(tempDt);

// tempDt.age = 30;

// console.log(tempDt.age);

const vm = new MVVM(tempDt);

// new Watcher(vm, function (value, oldValue) {
// 	// 一旦属性值有变化，会收到通知执行此更新函数，更新视图
// 	console.log(12345);
// });
