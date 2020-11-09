interface VirtualDomElementAttributes {
    [key:string]: any
}

interface VirtualDomElement {
    type: string,
    attributes?: VirtualDomElementAttributes,
    children?: VirtualElement[]
}

interface VirtualTextElement extends VirtualDomElement {
    type: 'Text',
    value: string
}

type VirtualElement = VirtualDomElement | VirtualTextElement | Component