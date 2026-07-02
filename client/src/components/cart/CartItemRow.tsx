import type { CartLineItemSnapshot } from '../../service/ClientTypes'

interface CartItemRowProps {
  item: CartLineItemSnapshot
  onQuantityChange(itemId: string, quantity: number): Promise<void>
}

export function CartItemRow({ item, onQuantityChange }: CartItemRowProps) {
  return (
    <article className="cart-item-row">
      <img src={item.thumbnailImage} alt="" />
      <div>
        <h2>{item.title}</h2>
        <p>{item.productType}</p>
        {item.selectedColor ? <p>Color: {item.selectedColor}</p> : null}
        {item.selectedSize ? <p>Size: {item.selectedSize}</p> : null}
        {item.clientInstructions ? <p>Notes: {item.clientInstructions}</p> : null}
      </div>
      <label>Quantity
        <input type="number" min="1" value={item.quantity} onChange={(event) => void onQuantityChange(item.itemId, Number(event.target.value))} />
      </label>
      <p>{formatPrice(item.lineTotal)}</p>
    </article>
  )
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
