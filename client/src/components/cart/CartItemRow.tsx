import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan } from '@fortawesome/free-solid-svg-icons'
import type { CartLineItemSnapshot } from '../../service/ClientTypes'

interface CartItemRowProps {
  item: CartLineItemSnapshot
  onQuantityChange(itemId: string, quantity: number): Promise<void>
  onRemove(item: CartLineItemSnapshot): Promise<void>
}

export function CartItemRow({ item, onQuantityChange, onRemove }: CartItemRowProps) {
  const decreaseQuantity = () => item.quantity <= 1 ? onRemove(item) : onQuantityChange(item.itemId, item.quantity - 1)
  const increaseQuantity = () => onQuantityChange(item.itemId, item.quantity + 1)

  return (
    <article className="cartItemRow">
      <img className="cartItemImage" src={item.thumbnailImage} alt="" />
      <div className="cartItemDetails">
        <h2>{item.title}</h2>
        <p className="cartItemType">{item.productType}</p>
        <div className="cartItemMeta">
          {item.selectedColor ? <span>Color: {item.selectedColor}</span> : null}
          {item.selectedSize ? <span>Size: {item.selectedSize}</span> : null}
        </div>
        {item.clientInstructions ? <p className="cartItemNotes">Notes: {item.clientInstructions}</p> : null}
      </div>
      <div className="cartQuantityControl" aria-label={`Quantity for ${item.title}`}>
        <button type="button" onClick={() => void decreaseQuantity()} aria-label={item.quantity <= 1 ? `Remove ${item.title} from cart` : `Decrease ${item.title} quantity`}>
          {item.quantity <= 1 ? <FontAwesomeIcon icon={faTrashCan} /> : '−'}
        </button>
        <span aria-live="polite">{item.quantity}</span>
        <button type="button" onClick={() => void increaseQuantity()} aria-label={`Increase ${item.title} quantity`}>+</button>
      </div>
      <p className="cartItemTotal">{formatPrice(item.lineTotal)}</p>
    </article>
  )
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
