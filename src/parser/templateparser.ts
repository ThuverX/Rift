const replacementRegex: RegExp = /\$\$__REPLACEMENT\[(?<ID>\d+)\]/

function purgeElements(vdomList: VirtualElement[]) {
    return vdomList.filter((vdom: VirtualElement, index: number) => {
        if(vdom.type == 'Text') {
            if((vdom as VirtualTextElement)?.value?.trim()?.length <= 0) return false
        }

        return true
    })
}

function r(strs: string[], ...vars: any[]) {

    let _replacementId = 0

    let parseString = strs.reduce((acc,cur, i) => 
        acc += (i != 0 ? `$$__REPLACEMENT[${_replacementId++}]` : '') + cur, '')

    let elements = parse(parseString)

    elements = purgeElements(elements)

    let element = elements[0]

    const getVar = (id:any) => vars[parseInt(id)]

    const replaceString = (str:string):any => {
        let matches = MutliRegex(str, replacementRegex)

        if(!matches || matches.length <= 0) return str

        let varValue: any = getVar(matches[0].groups.ID)

        if(typeof varValue === 'string') {
            return str.replace(`$$__REPLACEMENT[${matches[0].groups.ID}]`, varValue).trim()
        }

        return varValue
    }

    const replaceAttribute = (vdom: VirtualElement, key:string, value: string) => {
        key = replaceString(key)
        value = replaceString(value)

        vdom.attributes[key] = value
    }

    const replace = (vdom: VirtualElement) : void => {
        if(vdom.attributes) {
            for(let [key, value] of Object.entries(vdom.attributes))
                replaceAttribute(vdom, key, value)
        }

        if(vdom.children) {
            for(let i = 0; i < vdom.children.length; i++) {
                let child = vdom.children[i]
                if(child.type == 'Text') {
                    (child as VirtualTextElement).value = replaceString((child as VirtualTextElement).value)

                    if(typeof (child as VirtualTextElement).value !== 'string') {
                        let val: any = (child as VirtualTextElement).value
                        if(Array.isArray(val)) {
                            if(val.length > 0 && val.find(x => x.type)) {

                                val = val.map(x => {
                                    if(typeof x == 'string')
                                        return parse(x)

                                    if(Array.isArray(x)) 
                                        return x.flat()

                                    return x
                                }).flat()

                                child = val as any

                                vdom.children[i] = child
                            }
                        } else if(typeof val === 'object' && val.type) {
                            child = val as any

                            vdom.children[i] = child
                        }
                    }
                } else {
                    replace(child)
                }
            }

            vdom.children = vdom.children.flat()
        }
    }

    replace(element)

    return element
}