abstract class Component<T = {}> implements VirtualDomElement {

    props: T

    constructor(props: T, children?: VirtualElement[]) {
        this.props = props
        this.children = children || []

        this.update = this.update.bind(this)

        let self = this

        const attachToArray = (arr: any[]) => {
            let oldPush = arr.push

            arr.push = function(item: any) {
                self.update()

                if(typeof item == 'object')
                    attach(item)

                return oldPush.apply(this, arguments)
            }
        }

        const attach = (object: any) => {
            for(let [key, value] of Object.entries(object)) {
                if(!this.blockedProperties.includes(key)) {
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
        }

        if(this[this.constructor.name])
            this[this.constructor.name](props, children)

        setTimeout(() => {
            attach(this)
        }, 0)
    }

    public type:string
    public children?: VirtualElement[]
    public attributes?: VirtualDomElementAttributes

    public isRiftComponent: boolean = true
    static mountToRiftComponent: boolean = true

    private blockedProperties: string[] = ['type', 'children', 'attributes', 'blockedProperties']

    public _render() : void {
        for(let [key,value] of Object.entries(this.render()))
            this[key] = value
    }

    public dom: HTMLElement

    public update() : void {

        let OLD_DOM: VirtualElement = {
            type: this.type,
            children: this.children,
            attributes: this.attributes
        }

        this._render()

        let NEW_DOM: VirtualElement = {
            type: this.type,
            children: this.children,
            attributes: this.attributes
        }

        update(this.dom, OLD_DOM, NEW_DOM)
    }

    public render() : VirtualElement {
        throw new Error('Unimplemented')
    }
}