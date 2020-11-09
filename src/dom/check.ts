function stripVirtualDomChildren(vdom: VirtualElement) : VirtualElement {
    let copy: VirtualElement = {...vdom}
    
    if(copy.children) copy.children = []

    return copy
}

function isVirtualDomElement(vdom: VirtualElement) : boolean {
    assert(typeof vdom == 'object', `vdom should be an Object on ${JSON.stringify(stripVirtualDomChildren(vdom))}`)

    assert(typeof vdom.type == 'string', `vdom.type should be a String on ${JSON.stringify(stripVirtualDomChildren(vdom))}`)
    if(vdom.attributes)
        assert(typeof vdom.attributes == 'object', `vdom.attributes should be an Object on ${JSON.stringify(stripVirtualDomChildren(vdom))}`)

    if(vdom.children) {
        assert(Array.isArray(vdom.children), `vdom.children should be an Array on ${JSON.stringify(stripVirtualDomChildren(vdom))}`)

        // could also check each child again
    }

    return true
}