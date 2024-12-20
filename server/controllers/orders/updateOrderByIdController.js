import Orders from "../../models/order.js";
export default async function updateOrderByIdController(req, res, next){
    try{
        const { orderId } = req.params;
        const update = req.body;

        const updatedOrder = await Orders.findByIdAndUpdate(orderId, update, { returnDocument: "after" });
        if (!updatedOrder) return next({err: "Could not find order", code: 404}); 
        res.json(updatedOrder);
        console.log("Updated order", updatedOrder);
    }
    catch(err){
        next(err);
    }
}