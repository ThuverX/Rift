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

class UnimplementedRenderMethodError extends Error {
    name = 'UnimplementedRenderMethodError'

    constructor(type) {
        super()

        this.message = `Class [${type}] doesn't have a valid render function`
    }
}

function EmptyString(length = 1) {
    return Array(Math.floor(length)).fill('').join(' ')
}

class UnclosedHTMLElementError extends Error {
    name = 'UnclosedHTMLElementError'

    constructor(lineNumber, linestring) {
        super()

        this.message = `Unclosed HTML element on line ${lineNumber}\n${EmptyString(5)}at ${linestring.trim()}\n`
    }
}

class InternalError extends Error {
    name = 'InternalError'

    constructor(text) {
        super()

        this.message = text + `\n${EmptyString(5)}This error was caused by Rift's internals\n${EmptyString(5)}please report it on Github! (https://github.com/ThuverX/Rift)\n`
    }
}

class RequireFileError extends Error {
    name = 'RequireFileError'

    constructor(text) {
        super()

        this.message = text
    }
}

function AsArray(v) {
    return Array.isArray(v) ? v : [v]
}

function RegexMulti(string = '', regex = / /, flags = '') {
    let matches = string.match(new RegExp(regex, 'g' + flags))
    if(!matches) return []
    return matches.map(str => str.match(new RegExp(regex, flags)))
}

function Zip(a, b) {
    let arr = []
    for (let key in a) arr.push([a[key], b[key]])
    return arr
}

const requireRegistery = {}
let firstRequire = true

const requireMatcher = /require\(("|')(?<RequirePath>.+?)(\1)\)/

const require = function (file) {
    const fixFilename = (filename) => {
        if(filename.endsWith('.js')) return filename
        else return filename + '.js'
    }

    if(firstRequire) {
        const search = async (filename) => {
            let fetchResult = await fetch(filename)

            let jsResult = await fetchResult.text()
    
            requireRegistery[filename] = jsResult
    
            let matches = jsResult.match(new RegExp(requireMatcher, 'gs' ))
    
            if(!matches) return

            for(let result of matches) {
                let path = result.match(new RegExp(requireMatcher, 's' )).groups.RequirePath
                if(path) { 
                    await search(fixFilename(path))
                }
            }
        }

        return search(fixFilename(file)).then(() => {
            firstRequire = false
            return require(file)
        })
    }

    if(!requireRegistery[fixFilename(file)]) throw new RequireFileError(`Couldn't find '${file}' in require registery`)

    let returnValue = Function(`return (function(module = {exports:{}}){\n${requireRegistery[fixFilename(file)]}\n;return module})()`)()

    let returnExport = returnValue.exports || null
    
    const registerComponents = (obj) => {
        if(obj.$isRiftComponent) {
            Rift.registerComponent(obj)
            return
        }

        for(let [k,v] of Object.entries(obj)) {
            if(typeof v == 'object' && v.$isRiftComponent)
                Rift.registerComponent(v,k)
            else registerComponents(v)
        }
    }

    if(returnExport) registerComponents(returnExport)

    return returnExport
}

class $Rift_Instance {
    constructor() {}

    parseAttributes(string) {
        let results = RegexMulti(string, $Rift_Instance.regex.attributes, 's')

        let attributesReturns = {}

        for(let res of results)
            attributesReturns[res.groups.AttrKey] = res.groups.AttrValue || ''

        return attributesReturns
    }

    parse(string) {
        let tokens = [
            ['OpeningDomTag', /<(?<TagName>(?:\w|-)+)(?: (?<Attributes>(?:[^<>]|\\.)+?)|)>/, +1],
            ['ClosedDomTag', /<(?<TagName>(?:\w|-)+)(?: (?<Attributes>(?:[^<>]|\\.)+?)|)\/>/, 0],
            ['ClosingDomTag', /<\/(?<TagName>(?:\w|-)+)>/, -1],
            ['Text', /(?<Value>(?:(?:\\.)|[^<>])+)/, 0]
        ]
    
        let outTokens = []
    
        let str = string.replace(/\n|\r/,'') || ''
        let index = 0
        let numIndex = 0
        let depth = 0

        while(str.length > 0) {
            let indexBefore = index
            for(let [tokenName, tokenMatcher, depthIncrementer] of tokens) {
                let match = str.match(tokenMatcher)
                if(match && match.index == 0) {
                    str = str.substr(match[0].length).trim()

                    outTokens.push({
                        tokenName,
                        beginIndex: index,
                        endIndex: index + match[0].length,
                        data: match.groups,
                        numIndex,
                        depth
                    })
                    
                    depth += depthIncrementer
                    
                    index += match[0].length
                }
            }
            
            numIndex ++
    
            if(indexBefore == index) throw new InternalError('Tag did not get processed properly at index ' + index)
        }
    
        let group = (tokenList) => {
            let returnElements = []

            let currentElement = null
            let currentToken = null
            let elementChildren = []

            for(let token of tokenList) {
                if(token.tokenName == 'OpeningDomTag') {
                    if(!currentElement) {
                        currentElement = {
                            type: token.data.TagName,
                            attributes: this.parseAttributes(token.data.Attributes),
                            children: [],
                            $isRiftElement: true
                        }

                        currentToken = token
                    } else if(currentToken.depth != token.depth) {
                        elementChildren.push(token)
                    }
                } else if(token.tokenName == 'ClosingDomTag') {
                    if(currentElement && currentToken.depth == token.depth - 1) {
                        currentElement.children = group(elementChildren) || []

                        returnElements.push(currentElement)

                        currentElement = null
                        elementChildren = []

                        continue
                    } else if(currentToken.depth != token.depth) {
                        elementChildren.push(token)
                    }
                } else {
                    if(currentElement && currentToken.depth != token.depth) {
                        elementChildren.push(token)
                    } else {
                        if(token.tokenName == 'ClosedDomTag') {
                            returnElements.push({
                                type: token.data.TagName,
                                attributes: this.parseAttributes(token.data.Attributes),
                                children: [],
                                $isRiftElement: true
                            })
                        } else if(token.tokenName == 'Text') {
                            returnElements.push({
                                type: 'TextNode',
                                value: token.data.Value,
                                $isRiftString: true
                            })
                        }

                        if(returnElements.length == tokenList.length)
                            continue
                    }
                }
            }

            if(currentElement) {
                let lines = string.split('\n')
                let lineIndex = 0
                let lineNumber = -1

                lines.map((line, i) => {
                    if(lineNumber == -1 && currentToken.beginIndex >= lineIndex && currentToken.beginIndex < lineIndex + line.length) {
                        lineNumber = i 
                    } else {
                        lineIndex += line.length
                    }
                })
                
                throw new UnclosedHTMLElementError(lineNumber, lines[lineNumber])
            }

            return returnElements
        }

        return group(outTokens)
    }

    parseTemplateString(strs, vars) {
        let _replacement_id = 0

        let outString = strs.reduce((acc,cur, i) => 
            acc += (i != 0 ? `{$$REPLACEMENT_${_replacement_id++}}` : '') + cur, '')

        let outvdom = this.parse(outString)

        const stringReplace = (value) => {
            if(typeof value != 'string') return
            let matches = RegexMulti(value, $Rift_Instance.regex.replacement)
            if(!matches) return value

            for(let {groups:{ReplacementId}} of matches) {
                let replacement = vars[ReplacementId]
                if(typeof replacement == 'string') {
                    value = value.replace(`{$$REPLACEMENT_${ReplacementId}}`, replacement)
                } else if(typeof replacement == 'function') {
                    value = replacement
                } else if(typeof replacement == 'object' || Array.isArray(replacement)) {
                    value = JSON.stringify(replacement)
                } else {
                    value = 'null'
                }
            }

            return value
        }


        const replace = (object) => {
            if(object.$isRiftElement) {
                object.type = stringReplace(object.type)

                for(let [key,value] of Object.entries(object.attributes)) {
                    object.attributes[key] = stringReplace(value)
                }

                AsArray(object.children).map(replace)
            }

            if(object.$isRiftString) {
                object.value = stringReplace(object.value)
            }
        }

        AsArray(outvdom).map(replace)

        return outvdom
    }

    applyAttribute(node,key,value) {
        if(typeof value == 'function')
            node[key] = value
        else node.setAttribute(key, value)
    }

    diff(realElement, vLeft, vRight) {
        const diffChildren = (a,b) => {
            const childPatches = []

            a.forEach((oldChild, i) => childPatches.push(diff(oldChild, b[i])))

            const addPatches = []
            for (const addChild of b.slice(a.length)) {
                addPatches.push(node => {
                    node.appendChild(this.render(addChild))
                    return node
                })
            }

            return parentNode => {
                for (const [patch, child] of Zip(childPatches, parentNode.childNodes)) 
                    patch(child)

                for (const patch of addPatches) 
                    patch(parentNode)

                return parentNode
            }
        }

        const diffAttributes = (a,b) => {
            const patches = []

            for (const [k, v] of Object.entries(b)) {
                patches.push(node => {
                    this.applyAttribute(node,k,v)
                    return node
                })
            }

            for (const k in a) {
                if (!(k in b)) {
                    patches.push(node => {
                        node.removeAttribute(k)
                        return node
                    })
                }
            }

            return node => {
                for (const patch of patches)
                    patch(node)
            }
        }

        const diff = (a,b) => {
            if(!b) {
                return node => {
                    node.remove()
                    return null
                }
            }

            if(a.$isRiftString || b.$isRiftString) {
                if(a.value != b.value) {
                    return node => {
                        let newNode = this.render(b)
                        node.replaceWith(newNode)

                        b._internal_element_ = newNode
                        return newNode
                    }
                } else return node => node
            }

            if(a.type !== b.type) {
                return node => {
                    let newNode = this.render(b)
                    node.replaceWith(newNode)

                    b._internal_element_ = newNode
                    return newNode
                }
            }

            const attributesPatches = diffAttributes(a.attributes, b.attributes)
            const childrenPatches = diffChildren(a.children, b.children)

            return node => {
                attributesPatches(node)
                childrenPatches(node)

                b._internal_element_ = node
                return node
            }
        }

        return diff(vLeft,vRight)(realElement)
    }

    componentRegistery = {}

    registerComponent(component, name) {
        if(!name) name = component.name

        this.componentRegistery[name] = component
    }

    hasComponent(type) {
        return Object.keys(this.componentRegistery).includes(type)
    }

    createComponent(type, props) {
        if(type.$isRiftComponent) return new type(props)
        if(this.hasComponent(type)) return new this.componentRegistery[type](props)

        return new (Function('return ' + type)())(props)
    }

    render(vElement) {
        if(vElement.$isRiftElement) {
            if($Rift_Instance.elements.default.includes(vElement.type)) {
                let element = document.createElement(vElement.type)

                for(let [k, v] of Object.entries(vElement.attributes || {})) {
                    this.applyAttribute(element,k,v)
                }

                for(let vChild of vElement.children) {
                    AsArray(this.render(vChild)).map((child => element.appendChild(child)))
                }

                vElement._internal_element_ = element

                return element
            } else {
                let newComponent = this.createComponent(vElement.type, vElement.attributes)
                let elements = newComponent._render().map((c) => this.render(c))

                return elements
            }
        } else if(vElement.$isRiftString) {
            let element = document.createTextNode(vElement.value)

            vElement._internal_element_ = element

            return element
        }
    }

    update(vOld, vNew) {
        AsArray(Zip(vOld, vNew)).map(([l,r]) => {
            this.diff(l._internal_element_, l, r)
        })

        return vNew
    }

    toVirtual(compOrVdom) {
        let vdom = null

        if(compOrVdom.$isRiftElement) {
            vdom = compOrVdom
        } else if(compOrVdom.$isRiftComponent) {
            // create
        } else if(compOrVdom instanceof $Rift_Component) {
            vdom = compOrVdom._render()
        } else if(typeof compOrVdom == 'string') {
            vdom = this.parse(compOrVdom)
        }

        return vdom
    }

    root(element, compOrVdom) {
        let vdom = AsArray(this.toVirtual(compOrVdom))

        for(let vdomElement of vdom) {
            element.appendChild(this.render(vdomElement))
        }
    }
}

$Rift_Instance.regex = {
    attributes: /(?<AttrKey>(?:\w|-)+)(?:=('|")(?<AttrValue>.+?|)(?:\2)|)/,
    replacement: /\{\$\$REPLACEMENT_(?<ReplacementId>\d+)}/
}

$Rift_Instance.elements = {
    default: ['input','a','abbr','address','applet','area','article','aside','audio','b','base','basefont','bdi','bdo','blockquote','body','br','button','canvas','caption','cite','code','col','colgroup','data','datalist','dd','del','details','dfn','dialog','dir','div','dl','dt','em','embed','fieldset','figcaption','figure','font','footer','form','frame','frameset','h1','h2','h3','h4','h5','h6','head','header','hgroup','hr','html','i','iframe','img','ins','kbd','label','legend','li','link','main','map','mark','marquee','menu','meta','meter','nav','noscript','object','ol','optgroup','option','output','p','param','picture','pre','progress','q','rp','rt','ruby','s','samp','script','section','select','slot','small','source','span','strong','style','sub','summary','sup','table','tbody','td','template','textarea','tfoot','th','thead','time','title','tr','track','u','ul','var','video','wbr']
}

class $Rift_Component {

    constructor(props = {}) {
        let returnValue

        this.props = props
        
        if(this[this.constructor.name])
            returnValue = this[this.constructor.name](props)
            
        this.update = this.update.bind(this)

        let self = this

        const attachToArray = (arr) => {
            let oldPush = arr.push

            arr.push = function(item) {
                self.update()

                if(typeof item == 'object')
                    attach(item)

                return oldPush.apply(this, arguments)
            }
        }

        const attach = (object) => {
            for(let [key, value] of Object.entries(object)) {
                Object.defineProperty(object, key, {
                    set(newValue) {
                        let oldValue = object[key]

                        value = newValue
                        if(oldValue != newValue)
                            self.update()
                    },
                    get() {
                        return value
                    }
                })

                if(typeof value == 'object')
                    attach(value)

                if(Array.isArray(value)) 
                    attachToArray(value)
            }
        }

        attach(this)

        return returnValue
    }

    update() {
        this._internal_vdom_ = Rift.update(this._internal_vdom_, this.render())
    }

    _render() {
        let returnValue = this.render()
        this._internal_vdom_ = returnValue
        return returnValue
    }

    render() {
        throw new UnimplementedRenderMethodError(this.constructor.name)
    }
}

$Rift_Component.$isRiftComponent = true

const Component = $Rift_Component

function Rift(){let _inner=new $Rift_Instance();let _Rift=(data,...vars)=>_inner.parseTemplateString(data,vars);_Rift.toString=()=>'Rift Instance';_Rift.__proto__=_inner;return _Rift}

let r = Rift = new Rift()