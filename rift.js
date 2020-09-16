/* RiftHTML v0.3

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

class InvalidElementError extends Error {
    name = 'InvalidElementError'
    constructor(element) {
        super()
        this.message = `${JSON.stringify(element)}, is not a valid virtual document element`
    }
}

class $RiftHTML {

    __id = 0

    constructor() {
        this.renderRoot = this.renderRoot.bind(this)
        this.parse = this.parse.bind(this)
        this.parseTemplateString = this.parseTemplateString.bind(this)
    }
    
    attributes(attributeString){
        if(!attributeString || attributeString.length <= 0) return {}
        return attributeString.split(' ').reduce((accumulator, current) => {
            let match = current.match($RiftHTML.ATTRIBUTEMATCHER)

            if(!match) return {...accumulator,...{[current.split('=')[0]]: ''}}
            
            return {...accumulator, ...{[match.groups.key]: match.groups.value || true}}
        }, {})
    }
    
    parse(rhtml) {
        const domify = ({domtype:type, attributes, children}) => ({$isRiftElement:true, type, __id: this.__id++, attributes, children})

        let items = rhtml.match(new RegExp($RiftHTML.DOMMATCHER,'gs'))

        if(!items || items.length == 1) {
            let matched = rhtml.match(new RegExp($RiftHTML.DOMMATCHER,'s'))

            if(!matched) return rhtml

            if(matched.groups.children) matched.groups.children = this.parse(matched.groups.children)
            if(matched.groups.attributes) matched.groups.attributes = this.attributes(matched.groups.attributes)


            if(!matched.groups.attributes || matched.groups.attributes.length <= 0)  matched.groups.attributes = {}
            
            return domify(matched.groups)
        } else {
            return items.map(item => this.parse(item))
        }
    }

    verifyVirtualElement(virtualElement) {
        if(!virtualElement || !virtualElement.type || !virtualElement.$isRiftElement)
            throw new InvalidElementError(virtualElement)
    }

    renderDomElement(vdomElement) {
        this.verifyVirtualElement(vdomElement)

        if(!$RiftHTML.DEFAULTELEMENTS.includes(vdomElement.type)) {
            vdomElement = this.makeVirtual(eval(vdomElement.type))
        }
        
        let element = document.createElement(vdomElement.type)
            
        element.$$RIFTINDEX = vdomElement.__id
        
        //element.setAttribute('riftindex',vdomElement.__id)
        
        const processChild = (child) => {
            if(typeof child == 'string') {
                let textnode = document.createTextNode(child)

                element.appendChild(textnode)
            } else if(typeof child == 'object') {
                this.appendDomElement(element, child)
            }
        }

        const processAttribute = (key, value = true) => {
            if(typeof value == 'function') {
                element[key] = value
            } else element.setAttribute(key, value)
        }
        
        if(vdomElement.attributes) {
            Object.entries(vdomElement.attributes)
            .map(attr => processAttribute(...attr))
        }
        
        if(Array.isArray(vdomElement.children))
            vdomElement.children.map(processChild)
        else processChild(vdomElement.children)

        if(this.#currentcomponent && vdomElement.__id == this.#currentcomponent.__id) {
            this.#currentcomponent.__dom = element
            this.#currentcomponent = null
        }
        
        return element
    }

    #currentcomponent = null

    makeVirtual(component){
        if(component.$isRiftComponent) {
            let componentElement = new component()

            let renderResult = componentElement.render()

            componentElement.__id = renderResult.__id
            this.#currentcomponent = componentElement

            return renderResult
        } else if(component instanceof Component) {
            let renderResult = component.render()

            renderResult.__id = component.__id
            this.#currentcomponent = component

            return renderResult
        } else return component
    }

    appendDomElement(parentElement, virtualElement){
        if(Array.isArray(virtualElement))
            return virtualElement.map(child => parentElement.appendChild(this.renderDomElement(this.makeVirtual(child))))
        else return parentElement.appendChild(this.renderDomElement(this.makeVirtual(virtualElement)))
    }

    updateDomElement(originalElement, virtualElement) {
        if(Array.isArray(virtualElement))
            return virtualElement.map(child => originalElement.replaceWith(this.renderDomElement(this.makeVirtual(child))))
        else return originalElement.replaceWith(this.renderDomElement(this.makeVirtual(virtualElement)))
    }

    renderRoot(documentElement, component) {
        this.appendDomElement(documentElement, component)
    }

    parseTemplateString(strs, ...vars) {

        let _replacement_id = 0

        const incrementAndGetReplacement = () => `{$$REPLACEMENT_${_replacement_id++}}`

        let outString = strs.reduce((acc,cur, i) => 
            acc += (i != 0 ? incrementAndGetReplacement() : '') + cur, '')

        let outRHTML = this.parse(outString)

        const patchReplacementChildren = (rhtml, replacement) => {
            if(!Array.isArray(rhtml.children)) rhtml.children = []

            if(typeof replacement == 'string') {
                replacement = this.parse(replacement)
                rhtml.children.push(replacement)
            } else if(typeof replacement == 'number') {
                replacement = replacement.toString()
                rhtml.children.push(replacement)
            }
        }

        const patchReplacementAttribute = (rhtml, key, replacement) => {
            rhtml.attributes[key] = replacement
        }

        const recursiveReplacement = (rhtml) => {
            if(typeof rhtml.children == 'string') {
                let matcher = rhtml.children.match(new RegExp($RiftHTML.REPLACEMENTMATCHER,'gs'))
                if(matcher) matcher.map(item => {
                    let match = item.match(new RegExp($RiftHTML.REPLACEMENTMATCHER,'s'))

                    if(match)  {
                        if(Array.isArray(vars[match.groups.id]))
                            vars[match.groups.id].map(item => patchReplacementChildren(rhtml, item))
                        else patchReplacementChildren(rhtml, vars[match.groups.id])
                    }
                })
            } else {
                if(Array.isArray(rhtml.children))
                    rhtml.map(child => recursiveReplacement(child))
                else if(rhtml.children) recursiveReplacement(rhtml.children)
            }

            for(let [key,value] of Object.entries(rhtml.attributes)) {
                if(typeof value == 'string') {
                    let matcher = value.match(new RegExp($RiftHTML.REPLACEMENTMATCHER,'gs'))
                    if(matcher) matcher.map(item => {
                        let match = item.match(new RegExp($RiftHTML.REPLACEMENTMATCHER,'s'))

                        if(match) patchReplacementAttribute(rhtml, key, vars[match.groups.id])
                    })
                }
            }
        }

        recursiveReplacement(outRHTML)

        return outRHTML
    }

}

$RiftHTML.DOMMATCHER = /<(?<domtype>\w+)(?: |)(?<attributes>.*?)(?:\/>|>(?<children>.*?)(?:<\/(?:\1)>))/
$RiftHTML.ATTRIBUTEMATCHER = /(?<key>\w+)=('|")(?<value>.+)\2/
$RiftHTML.REPLACEMENTMATCHER = /\{\$\$REPLACEMENT_(?<id>\d+)}/
$RiftHTML.DEFAULTELEMENTS = ['a','abbr','address','applet','area','article','aside','audio','b','base','basefont','bdi','bdo','blockquote','body','br','button','canvas','caption','cite','code','col','colgroup','data','datalist','dd','del','details','dfn','dialog','dir','div','dl','dt','em','embed','fieldset','figcaption','figure','font','footer','form','frame','frameset','h1','h2','h3','h4','h5','h6','head','header','hgroup','hr','html','i','iframe','img','input','ins','kbd','label','legend','li','link','main','map','mark','marquee','menu','meta','meter','nav','noscript','object','ol','optgroup','option','output','p','param','picture','pre','progress','q','rp','rt','ruby','s','samp','script','section','select','slot','small','source','span','strong','style','sub','summary','sup','table','tbody','td','template','textarea','tfoot','th','thead','time','title','tr','track','u','ul','var','video','wbr'];


class Component {
    __id = -1

    constructor() {
        let returnValue

        if(this[this.constructor.name])
            returnValue = this[this.constructor.name]()

        let self = this

        const recursiveAttach = (element) => {
            for(let [key,value] of Object.entries(element)) {
                if(!Component.$blockedComponentVariables.includes(key)) {
                    Object.defineProperty(element, key,{
                        set(newValue){
                            let old = value
                            value = newValue

                            if(old != value)
                                self.update()
                        },
        
                        get(){
                            return value
                        }
                    })

                    if(typeof value == 'object')
                        recursiveAttach(value)
                }
            }
        }

        recursiveAttach(this)

        return returnValue
    }

    update() {
        if(this.__dom)
            $R.updateDomElement(this.__dom, this)
    }

    render() {
        throw 'Unimplemented error'
    }
}

Component.$isRiftComponent = true
Component.$blockedComponentVariables = ['__id','__dom']

const $R = RiftHTML = new $RiftHTML()
const rhtml = RiftHTML.parseTemplateString