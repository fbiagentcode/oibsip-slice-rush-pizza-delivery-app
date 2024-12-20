import express from "express";
import authenticate from "../middlewares/authenticate.js";
import getOrdersController from "../controllers/orders/getOrdersController.js";
import getOrderByIdController from "../controllers/orders/getOrderByIdController.js";
import updateOrderByIdController from "../controllers/orders/updateOrderByIdController.js";

const router = express.Router();

router.route("/")
.get(authenticate, getOrdersController);

router.route("/:orderId")
.get(authenticate, getOrderByIdController)
.put(authenticate, updateOrderByIdController);

export default router;