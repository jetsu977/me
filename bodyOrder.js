const low = require('lowdb');
const faker = require('faker');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

const logisticID = db.get('ongkir.logisticID').value();
const shippingPrice = db.get('ongkir.shippingPrice').value();
const productPrice = db.get('product.price').value();
const paymentFee = db.get('payment.paymentFee').value();
const optionInfo = db.get('payment.optionInfo').value();
const addressId = db.get('general.addressId').value();
const paymentId = db.get('payment.id').value();
const modelId = db.get('product.modelId').value();
const promotionId = db.get('product.promotionId').value();
const startTime = db.get('product.startTime').value();
const itemId = db.get('product.itemId').value();
const ping = db.get('general.ping').value();
const shopId = db.get('product.shopId').value();
const image = db.get('product.image').value();
const name = db.get('product.name').value();

const orderTotal = productPrice + shippingPrice;
const totalPayment = productPrice + shippingPrice + paymentFee;

const body = () => JSON.stringify(
  {
  "client_id": 8,
  "cart_type": 1,
  "timestamp": startTime - ping,
  "checkout_price_data": {
    "merchandise_subtotal": productPrice,
    "total_payable": totalPayment,
    "shipping_subtotal": shippingPrice,
    "shipping_subtotal_before_discount": shippingPrice,
    "buyer_txn_fee": paymentFee
  },
  "promotion_data": {
    "platform_vouchers": []
  },
  "selected_payment_channel_data": {
    "version": 2,
    "channel_id": paymentId,
    "channel_item_option_info": {
      "option_info": optionInfo
    }
  },
  "shoporders": [
    {
      "shop": {
        "shopid": shopId,
        "shop_name": "Official"
      },
      "items": [
        {
          "itemid": itemId,
          "modelid": modelId,
          "quantity": 1,
          "item_group_id": null,
          "shopid": shopId,
          "shippable": true,
          "price": productPrice,
          "name": name,
          "model_name": "",
          "add_on_deal_id": 0,
          "is_add_on_sub_item": false,
          "image": image,
          "checkout": true
        }
      ],
      "shipping_fee": shippingPrice,
      "order_total_without_shipping": productPrice,
      "order_total": orderTotal
    }
  ],
  "shipping_orders": [
    {
      "shipping_id": 1,
      "shoporder_indexes": [
        0
      ],
      "selected_logistic_channelid": logisticID,
      "buyer_address_data": {
        "addressid": addressId,
        "address_type": 0
      },
      "order_total": orderTotal,
      "order_total_without_shipping": productPrice,
      "shipping_fee": shippingPrice,
      "sync": false
    }
  ],
  "disabled_checkout_info": {},
  "can_checkout": true,
  "ignore_warnings": true,

  "device_info": {},
  "device_type": "mobile",
  "_cft": [383]
},
);

module.exports = { body };
