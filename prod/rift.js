/* RiftHTML b20

MIT License

Copyright (c) 2020 ThuverX

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
const Rift = {
    root: mount,
    mount: mount,
    render: render,
    diff: diff
};
class Component {
    constructor(props, children) {
        this.isRiftComponent = true;
        this.blockedProperties = ['type', 'children', 'attributes', 'blockedProperties'];
        this.props = props;
        this.children = children || [];
        this.update = this.update.bind(this);
        let self = this;
        const attachToArray = (arr) => {
            let oldPush = arr.push;
            arr.push = function (item) {
                self.update();
                if (typeof item == 'object')
                    attach(item);
                return oldPush.apply(this, arguments);
            };
        };
        const attach = (object) => {
            for (let [key, value] of Object.entries(object)) {
                if (!this.blockedProperties.includes(key)) {
                    Object.defineProperty(object, key, {
                        set(newValue) {
                            let oldValue = object[key];
                            value = newValue;
                            if (oldValue != newValue)
                                self.update();
                        },
                        get() {
                            return value;
                        }
                    });
                    if (typeof value == 'object')
                        attach(value);
                    if (Array.isArray(value))
                        attachToArray(value);
                }
            }
        };
        if (this[this.constructor.name])
            this[this.constructor.name](props, children);
        setTimeout(() => {
            attach(this);
        }, 0);
    }
    _render() {
        if (!this.render())
            return;
        for (let [key, value] of Object.entries(this.render()))
            this[key] = value;
    }
    update() {
        let OLD_DOM = {
            type: this.type,
            children: this.children,
            attributes: this.attributes
        };
        this._render();
        let NEW_DOM = {
            type: this.type,
            children: this.children,
            attributes: this.attributes
        };
        update(this.dom, OLD_DOM, NEW_DOM);
    }
    render() {
        throw new Error('Unimplemented');
    }
}
Component.mountToRiftComponent = true;
const components = {
    _registered_components: {},
    register: (comp, name) => {
        // @ts-ignore
        if (!name)
            name = comp.name;
        components._registered_components[name] = comp;
    },
    get: (name) => components._registered_components[name],
    has: (name) => !!components._registered_components[name]
};
// @ts-ignore
window.registerComponent = components.register;
// @ts-ignore
window.components = components;
function renderComponent(comp) {
    if (!comp)
        return null;
    comp._render();
    let returnValue = render(comp);
    if (!returnValue)
        return null;
    comp.dom = returnValue;
    return returnValue;
}
function stripVirtualDomChildren(vdom) {
    let copy = { ...vdom };
    if (copy.children)
        copy.children = [];
    return copy;
}
function isVirtualDomElement(vdom) {
    assert(typeof vdom == 'object', `vdom should be an Object on ${JSON.stringify(stripVirtualDomChildren(vdom))}`);
    assert(typeof vdom.type == 'string', `vdom.type should be a String on ${JSON.stringify(stripVirtualDomChildren(vdom))}`);
    if (vdom.attributes)
        assert(typeof vdom.attributes == 'object', `vdom.attributes should be an Object on ${JSON.stringify(stripVirtualDomChildren(vdom))}`);
    if (vdom.children) {
        assert(Array.isArray(vdom.children), `vdom.children should be an Array on ${JSON.stringify(stripVirtualDomChildren(vdom))}`);
        // could also check each child again
    }
    return true;
}
const diffChildren = function (v1, v2) {
    const childPatches = [];
    v1.map((oldChild, i) => childPatches.push(diff(oldChild, v2[i])));
    const addPatches = [];
    for (const addChild of v2.slice(v1.length)) {
        addPatches.push((NODE) => mount(NODE, addChild));
    }
    return (PARENT_NODE) => {
        for (const [patch, child] of Zip(childPatches, PARENT_NODE.childNodes))
            patch(child);
        for (const patch of addPatches)
            patch(PARENT_NODE);
    };
};
const diffAttributes = function (v1, v2) {
    const patches = [];
    for (const [key, value] of Object.entries(v2)) {
        patches.push((NODE) => applyAttribute(NODE, key, value));
    }
    for (const k in v1) {
        if (!(k in v2)) {
            patches.push((NODE) => NODE.removeAttribute(k));
        }
    }
    return (NODE) => {
        for (const patch of patches)
            patch(NODE);
    };
};
function diff(v1, v2) {
    var _a, _b, _c, _d;
    if (!v1) {
        return (NODE) => {
            NODE.remove();
        };
    }
    if (((_b = (_a = v1) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.toString()) != ((_d = (_c = v2) === null || _c === void 0 ? void 0 : _c.value) === null || _d === void 0 ? void 0 : _d.toString())) {
        return (NODE) => {
            let NEW_NODE = render(v2);
            NODE.replaceWith(NEW_NODE);
        };
    }
    if (v1.type !== v2.type) {
        return (NODE) => {
            let NEW_NODE = render(v2);
            NODE.replaceWith(NEW_NODE);
        };
    }
    const attributesPatches = diffAttributes(v1.attributes || {}, v2.attributes || {});
    const childrenPatches = diffChildren(v1.children || [], v2.children || []);
    return (NODE) => {
        attributesPatches(NODE);
        childrenPatches(NODE);
    };
}
function update(element, v1, v2) {
    diff(v1, v2)(element);
}
function mount(element, vdom) {
    if (vdom.mountToRiftComponent) {
        let ret = renderComponent(new vdom());
        if (ret)
            return element.appendChild(ret);
        return null;
    }
    if (vdom.isRiftComponent) {
        let ret = renderComponent(vdom);
        if (ret)
            return element.appendChild(ret);
        return null;
    }
    let ret = render(vdom);
    if (ret)
        return element.appendChild(ret);
    return null;
}
function applyAttribute(element, key, value) {
    if (typeof value == 'function') {
        element[key] = value;
    }
    else {
        if (key == 'style' && typeof value == 'object') {
            for (let [k, v] of Object.entries(value)) {
                element['style'][k] = v;
            }
        }
        else if (key == 'classlist') {
            if (Array.isArray(value))
                element.setAttribute('class', value.filter(x => !!x).join(' '));
        }
        else {
            element.setAttribute(key, value);
        }
    }
}
function render(vdom) {
    isVirtualDomElement(vdom);
    if (vdom.type !== 'Text') {
        if (components.has(vdom.type)) {
            return renderComponent(new (components.get(vdom.type))(vdom.attributes, vdom.children));
        }
        let element = document.createElement(vdom.type);
        if (vdom.attributes) {
            for (let [key, value] of Object.entries(vdom.attributes)) {
                applyAttribute(element, key, value);
            }
        }
        if (vdom.children) {
            for (let child of vdom.children) {
                mount(element, child);
            }
        }
        return element;
    }
    else {
        if (vdom.children) {
            vdom.value = vdom.children[0].value;
        }
        let element = document.createTextNode(vdom.value);
        return element;
    }
}
const replacementRegex = /\$\$__REPLACEMENT\[(?<ID>\d+)\]/;
function purgeElements(vdomList) {
    return vdomList.filter((vdom, index) => {
        var _a, _b, _c;
        if (vdom.type == 'Text') {
            if (((_c = (_b = (_a = vdom) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.trim()) === null || _c === void 0 ? void 0 : _c.length) <= 0)
                return false;
        }
        return true;
    });
}
function r(strs, ...vars) {
    let _replacementId = 0;
    let parseString = strs.reduce((acc, cur, i) => acc += (i != 0 ? `$$__REPLACEMENT[${_replacementId++}]` : '') + cur, '');
    let elements = parse(parseString);
    elements = purgeElements(elements);
    let element = elements[0];
    const getVar = (id) => vars[parseInt(id)];
    const replaceString = (str) => {
        let matches = MutliRegex(str, replacementRegex);
        if (!matches || matches.length <= 0)
            return str;
        let varValue = getVar(matches[0].groups.ID);
        if (typeof varValue === 'string') {
            return str.replace(`$$__REPLACEMENT[${matches[0].groups.ID}]`, varValue).trim();
        }
        return varValue;
    };
    const replaceAttribute = (vdom, key, value) => {
        key = replaceString(key);
        value = replaceString(value);
        vdom.attributes[key] = value;
    };
    const replace = (vdom) => {
        if (vdom.attributes) {
            for (let [key, value] of Object.entries(vdom.attributes))
                replaceAttribute(vdom, key, value);
        }
        if (vdom.children) {
            for (let i = 0; i < vdom.children.length; i++) {
                let child = vdom.children[i];
                if (child.type == 'Text') {
                    child.value = replaceString(child.value);
                    if (typeof child.value !== 'string') {
                        let val = child.value;
                        if (Array.isArray(val)) {
                            if (val.length > 0 && val.find(x => x.type)) {
                                val = val.map(x => {
                                    if (typeof x == 'string')
                                        return parse(x);
                                    if (Array.isArray(x))
                                        return x.flat();
                                    return x;
                                }).flat();
                                child = val;
                                vdom.children[i] = child;
                            }
                        }
                        else if (typeof val === 'object' && val.type) {
                            child = val;
                            vdom.children[i] = child;
                        }
                    }
                }
                else {
                    replace(child);
                }
            }
            vdom.children = vdom.children.flat();
        }
    };
    replace(element);
    return element;
}
var TokenType;
(function (TokenType) {
    TokenType[TokenType["ClosedDomTag"] = 0] = "ClosedDomTag";
    TokenType[TokenType["OpeningDomTag"] = 1] = "OpeningDomTag";
    TokenType[TokenType["ClosingDomTag"] = 2] = "ClosingDomTag";
    TokenType[TokenType["Text"] = 3] = "Text";
})(TokenType || (TokenType = {}));
const tokens = [
    [TokenType.ClosedDomTag, /<(?<TagName>(?:\w|-)+)(?: (?<Attributes>(?:[^<>]|\\.)+?)|)\/>/, 0],
    [TokenType.OpeningDomTag, /<(?<TagName>(?:\w|-)+)(?: (?<Attributes>(?:[^<>]|\\.)+?)|)>/, +1],
    [TokenType.ClosingDomTag, /<\/(?<TagName>(?:\w|-)+)>/, -1],
    [TokenType.Text, /(?<Value>(?:(?:\\.)|[^<>])+)/, 0]
];
const attributeMatcher = /(?<AttrKey>(?:\w|-)+)(?:=('|")(?<AttrValue>.+?|)(?:\2)|)/;
function parseAttributes(inputString) {
    if (!inputString)
        return {};
    let results = MutliRegex(inputString, attributeMatcher, 's');
    let attributesReturns = {};
    for (let res of results)
        attributesReturns[res.groups.AttrKey] = res.groups.AttrValue || '';
    return attributesReturns;
}
function parse(inputString) {
    assert(!!inputString, `Can't parse empty input InputString`);
    assert(inputString.length > 0, `InputString should be longer than one`);
    let outTokens = [];
    let str = inputString.replace(/\n|\r/, '') || '';
    let index = 0;
    let numIndex = 0;
    let depth = 0;
    while (str.length > 0) {
        let indexBefore = index;
        for (let [tokenType, tokenMatcher, depthIncrementer] of tokens) {
            let match = str.match(tokenMatcher);
            if (match && match.index == 0) {
                str = str.substr(match[0].length).trim();
                outTokens.push({
                    tokenType,
                    beginIndex: index,
                    endIndex: index + match[0].length,
                    data: match.groups,
                    numIndex,
                    depth
                });
                depth += depthIncrementer;
                index += match[0].length;
            }
        }
        numIndex++;
        if (indexBefore == index)
            throw new Error('Tag did not get processed properly at index ' + index);
    }
    let group = (tokenList) => {
        let returnElements = [];
        let currentElement = null;
        let currentToken = null;
        let elementChildren = [];
        for (let token of tokenList) {
            if (token.tokenType == TokenType.OpeningDomTag) {
                if (!currentElement) {
                    currentElement = {
                        type: token.data.TagName,
                        attributes: parseAttributes(token.data.Attributes),
                        children: []
                    };
                    currentToken = token;
                }
                else if (currentToken.depth != token.depth) {
                    elementChildren.push(token);
                }
            }
            else if (token.tokenType == TokenType.ClosingDomTag) {
                if (currentElement && currentToken.depth == token.depth - 1) {
                    currentElement.children = group(elementChildren) || [];
                    returnElements.push(currentElement);
                    currentElement = null;
                    elementChildren = [];
                    continue;
                }
                else if (currentToken.depth != token.depth) {
                    elementChildren.push(token);
                }
            }
            else {
                if (currentElement && currentToken.depth != token.depth) {
                    elementChildren.push(token);
                }
                else {
                    if (token.tokenType == TokenType.ClosedDomTag) {
                        returnElements.push({
                            type: token.data.TagName,
                            attributes: this.parseAttributes(token.data.Attributes),
                            children: []
                        });
                    }
                    else if (token.tokenType == TokenType.Text) {
                        returnElements.push({
                            type: 'Text',
                            value: token.data.Value
                        });
                    }
                    if (returnElements.length == tokenList.length)
                        continue;
                }
            }
        }
        // if(currentElement) {
        //     let lines = inputString.split('\n')
        //     let lineIndex = 0
        //     let lineNumber = -1
        //     lines.map((line, i) => {
        //         if(lineNumber == -1 && currentToken.beginIndex >= lineIndex && currentToken.beginIndex < lineIndex + line.length) {
        //             lineNumber = i 
        //         } else {
        //             lineIndex += line.length
        //         }
        //     })
        //     throw new UnclosedHTMLElementError(lineNumber, lines[lineNumber])
        // }
        return returnElements;
    };
    return group(outTokens);
}
function Zip(a, b) {
    let arr = [];
    for (let key in a)
        arr.push([a[key], b[key]]);
    return arr;
}
function MutliRegex(str, regex, flags = '') {
    let matches = str.match(new RegExp(regex, 'g' + flags));
    if (!matches)
        return [];
    return matches.map(str => str.match(new RegExp(regex, flags)));
}
class AssertionError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'AssertionError';
    }
}
function assert(statement, message) {
    if (!!statement)
        return;
    throw new AssertionError(message);
}
//# sourceMappingURL=rift.js.map