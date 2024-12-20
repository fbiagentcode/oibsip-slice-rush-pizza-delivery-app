import mongoose from "mongoose";
import Stripe from "stripe";

import Orders from "../../models/order.js";
import Ingredients from "../../models/ingredient.js";
import Users from "../../models/user.js";
import pizzaVarieties from "../../models/pizzaVariety.js";
import sendMail from "../../utils/sendMail.js";

const origin = process.env.VITE_ORIGIN;
const webhookSecret = process.env.WEBHOOK_SECRET;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function placeOrderController(req, res, next){
    try{
        const { body, headers } = req;
        const { "stripe-signature": signature } = headers;
        
        const event = stripe.webhooks.constructEvent(
            body, 
            signature, 
            webhookSecret
        );

        if (event.type === "checkout.session.completed"){
            
            const { metadata } = event.data.object;

            // convert strings representing nested structures to objects
            const total = JSON.parse(metadata.total);
            const products = JSON.parse(metadata.products);

            // extract order info
            const { userId, deliveryAddress } = metadata;

            console.log("36", products, userId, total, deliveryAddress);

            const productIds = products.map(({productId= "N/A"}) => productId);
            const productsMap = new Map(products.map(item => [String(item.productId), item]));
            
            console.log("ids", productIds, "map", productsMap);

            const lowStockItems = [];
            const soldOutItems = [];
    
            // check if user placing order is valid
            const user = await Users.findById(userId);
            if (!user) return next({err: "User does not exist.", code: 400});
        
            // check if invalid/unavailable products are part of order
            const pizzaVarietiesOrdered = await pizzaVarieties.find({ 
                _id: { $in: productIds },
                isAvailable: true
            });
    
            // go through all pizzas' ingredients
            pizzaVarietiesOrdered.forEach((pizza) => {
                for (const ingredientId of pizza.ingredients){
                    const ingredient = productsMap.get(String(ingredientId));
                    const pizzaQty = productsMap.get(String(pizza._id)).qty;
    
                    // update ingredient stock
                    if (ingredient) return ingredient.qty += pizzaQty;
                    // add ingredient
                    productsMap.set(String(ingredientId), {productId: (ingredientId), qty: pizzaQty});
                    productIds.push(ingredientId);
                }
            });
    
            const ingredientsOrdered = await Ingredients.find({ 
                _id: { $in: productIds },
                isAvailable: true
            });
    
            const productsOrdered = ingredientsOrdered.concat(pizzaVarietiesOrdered);
            console.log("prod id", productIds, "prod ordered", productsOrdered);

            if(productsOrdered.length !== productIds.length) 
                return next({err: "Products which do not exist/are unavailable have been found in the order.", code: 400});
    
            // do not place order if stock requirements not met
            ingredientsOrdered.forEach(ingredient => {
                const product = productsMap.get(String(ingredient._id));
                // set actual stock for each product ordered to use later
                product["stock"] = ingredient?.stock?.amount - product.qty;
                
                // add to sold out items list
                if (!product.stock) soldOutItems.push(product.productId);
                // add ingredient to low stock list
                if (product.stock <= ingredient.stock?.threshold) lowStockItems.push({ingredient, newStock: product.stock});
                if (product.stock < 0){
                    const err = {};
                    err[ingredient.name] = "Insufficient stock.";
                    return next({err, code: 422});
                }
            });
        
            const session = await mongoose.startSession();
            session.startTransaction();
    
            // order object
            const orderDetails = { products, userId, total, deliveryAddress };

            // place order
            const [ order ] = await Orders.create([orderDetails], {session});
    
            // store order ref in user doc
            user.orders.push(order._id);
            await user.save();
    
            // create bulk update stock queries
            let writes = []
            for (const [ productId, { qty, stock } ] of productsMap){
                writes.push({
                    updateOne: {
                        filter: { _id: productId },
                        update: { 
                            $inc: { "stock.amount": -qty },
                            $set: { isAvailable: Boolean(stock) }
                        }   
                    }
                });
            }
    
            await Ingredients.bulkWrite(writes, {session});
            // update availability
            await pizzaVarieties.updateMany({
                ingredients: { $in: soldOutItems }
            }, { isAvailable: false });
    
            await session.commitTransaction();
            await session.endSession();
    
            // send email alerts to admin on low stock items
            const lowStockCount = lowStockItems.length;
            if (lowStockCount){
                // setup mail headers
                const mail = { 
                    subject: `Alert: ${lowStockCount} INGREDIENTS ON LOW STOCK`,
                    to: process.env.ADMIN_USER + "@inbox.mailtrap.io" 
                };
                // create body for mail
                const link = `${origin}/admin-dashboard`;
                mail.content = "<h1>These ingredients require restocking ASAP: </h1>" + "<ul>"
                lowStockItems.forEach(({ingredient, newStock}) => {
                    return (
                        mail.content += `<li>${ingredient.name} - Stock: ${ingredient.stock?.amount - newStock}</li>`
                    );
                });
                mail.content += `</ul><p>Restock now at the dashboard: <a href= ${link}</a></p>`;
                await sendMail(mail);
            }
    
            const orderPlaced = {
                orderPlaced: true,
                _id: order._id,
                placedAt: order.placedAt
            };
    
            console.log(orderPlaced);
            return res.json(orderPlaced);
        }
        next({err: "Something went wrong.", code: 500});
    }
    catch(err){
        next(err);
    }
}

