/* RiftHTML v0.2

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

Object.defineProperty(String.prototype, 'hashCode', {
    value: function() {
        let hash = 0, i, chr

        for (i = 0; i < this.length; i++) {
            chr   = this.charCodeAt(i)
            hash  = ((hash << 5) - hash) + chr
            hash |= 0
        }

        return hash
    }
})

Function.prototype._bind = Function.prototype.bind

Function.prototype.bind = function(self) {
    if(self.__id)
        this.__proto__.id = self.__id
    return this._bind(...arguments)
}

class InvalidRenderMethod extends Error {
    name = 'InvalidRenderMethod'
}

class InvalidVirtualDomElement extends Error {
    name = 'InvalidVirtualDomElement'
}

const DefaultElements = [
    'a',
    'abbr',
    'address',
    'applet',
    'area',
    'article',
    'aside',
    'audio',
    'b',
    'base',
    'basefont',
    'bdi',
    'bdo',
    'blockquote',
    'body',
    'br',
    'button',
    'canvas',
    'caption',
    'cite',
    'code',
    'col',
    'colgroup',
    'data',
    'datalist',
    'dd',
    'del',
    'details',
    'dfn',
    'dialog',
    'dir',
    'div',
    'dl',
    'dt',
    'em',
    'embed',
    'fieldset',
    'figcaption',
    'figure',
    'font',
    'footer',
    'form',
    'frame',
    'frameset',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'head',
    'header',
    'hgroup',
    'hr',
    'html',
    'i',
    'iframe',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'link',
    'main',
    'map',
    'mark',
    'marquee',
    'menu',
    'meta',
    'meter',
    'nav',
    'noscript',
    'object',
    'ol',
    'optgroup',
    'option',
    'output',
    'p',
    'param',
    'picture',
    'pre',
    'progress',
    'q',
    'rp',
    'rt',
    'ruby',
    's',
    'samp',
    'script',
    'section',
    'select',
    'slot',
    'small',
    'source',
    'span',
    'strong',
    'style',
    'sub',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'template',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'title',
    'tr',
    'track',
    'u',
    'ul',
    'var',
    'video',
    'wbr'
]

class _RiftHTML {
    options = {}

    functionList = {}

    constructor(options = {}){
        this.options = {...options,...this.options}

        this.fromtemplateString = this.fromtemplateString.bind(this)
        this.renderRoot = this.renderRoot.bind(this)
        this.renderDom = this.renderDom.bind(this)
        this.updateDom = this.updateDom.bind(this)
    }

    attributeMatcher = /(?<key>\w+)=('|")(?<value>.+)\2/
    domMatcher = /<(?<domtype>\w+)(?: |)(?<attributes>.*?)(?:\/>|>(?<children>.*?)(?:<\/(?:\1)>))/
    
    attributes(attributeString){
        return attributeString.split(' ').map(item => {let match = item.match(this.attributeMatcher); return match ? {...match.groups} : {key:item, value:true}})
    }

    domify({domtype,attributes,children}){
        let attrlist = attributes ? attributes.map(({key,value}) => ({key,value})): []

        let newattrs = {}
        for(let attr of attrlist)
            newattrs[attr.key] = attr.value

        let childs = !Array.isArray(children) ? [children] : children || null

        if(!children) childs = null

        return {$isRiftElement:true,type: domtype,id:++this.id,attributes: newattrs,children: childs}
    }
    
    parse(rhtml) {
        let items = rhtml.match(new RegExp(this.domMatcher,'gs'))

        if(!items || items.length == 1) {
            let matched = rhtml.match(new RegExp(this.domMatcher,'s'))

            if(!matched) return rhtml

            if(matched.groups.children) matched.groups.children = this.parse(matched.groups.children)
            if(matched.groups.attributes) matched.groups.attributes = this.attributes(matched.groups.attributes)
            
            return this.domify(matched.groups)
        } else {
            return items.map(item => this.parse(item))
        }
    }
    
    fromtemplateString(str,...args) {
        let i = 0

        let final = str.map(x => {
            if(args[i]) {
                let element = args[i++]
                if(typeof element == 'function') {
                    let name = (element.name + element.toString().hashCode())
                        .replace(/( |-|_)/g,'_')
                        .replace('bound_','')

                    name = name.substr(0,10) + name.hashCode() + '_' + (element.__proto__.id || this.__id)

                    this.functionList[name] = element

                    element = name
                } else if(typeof element == 'object') {
                    element = JSON.stringify(element)
                }

                return x + element
            }

            return x
        }).join('')
    
        return this.parse(final)
    }

    renderRoot(element, object) {
        this.__dom = object instanceof Component ? 
            this.renderDom(element, object.render(element)) :
            this.__dom = this.renderDom(element, object)
    }

    createDomElement({type, attributes, children}) {
        let domElement = document.createElement(type)
        
        for(let [key,value] of Object.entries(attributes)) {
            if(key == 'onclick') {
                domElement.onclick = (event) => R.functionList[value](event)
            }
            else if(key == 'classlist') {
                let val = JSON.parse(value).filter(z => z).join(' ')
                if(val.length > 0)
                domElement.setAttribute('class', val)
            }
            else domElement.setAttribute(key,value)
        }

        if(children)
            for(let child of children)
                if(typeof child == 'string')
                    domElement.innerText += child
        
        return domElement
    }
    
    renderDom(parent, vdom, replace = false){
        if(Array.isArray(vdom)) return vdom.map(i => this.renderDom(parent,i))
        if(!vdom.type) throw new InvalidVirtualDomElement(`Virtual dom element: ${JSON.stringify(vdom)}, is not valid`)
        
        let element

        let id = vdom.id || this.__id++

        if(DefaultElements.includes(vdom.type))
            element = this.createDomElement(vdom)
        else {
            let component = new (eval(vdom.type))(vdom.attributes)
            component.__id = id

            element = this.renderDom(parent, component.render(), replace)
            component.__instance = element
        }
        
        element.$$riftindex = id
        
        if(vdom.children)
            for(let child of vdom.children) {
                if(typeof child != 'string')
                    this.renderDom(element, child)
            }

        if(!replace) 
            parent.appendChild(element)
        else {
            parent.replaceWith(element)
            replace.__instance = element
        }

        return element
    }

    updateDom(instance, element) {
        let rhtml = element._render()

        this.renderDom(instance, rhtml, element)
    }

    __id = 0
}

const RiftHTML = R = new _RiftHTML()
const rhtml = R.fromtemplateString

class Component {

    __blocked_key_names__ = ['__id','props']

    constructor(props) {
        let returnValue = null

        this.__id = 0

        this.props = props

        if(this.constructor.name != 'Component' && this[this.constructor.name]) 
            returnValue = this[this.constructor.name].call(this,arguments)

        for(let [key,value] of Object.entries(this)) {
            if(!this.__blocked_key_names__.includes(key)) Object.defineProperty(this,key,{
                set(newValue){
                    let old = value
                    value = newValue
                    if(old != value)
                        this.update()
                },

                get(){
                    return value
                }
            })
        }

        return returnValue
    }

    update() {
        if(!this.__instance) return

        R.updateDom(this.__instance, this)
    }

    _render(){
        let rhtml = this.render()

        rhtml.id = this.__id

        return rhtml
    }

    render(){
        throw new InvalidRenderMethod('Render method not supplied to Component of type ' + this.constructor.name)
    }
}

