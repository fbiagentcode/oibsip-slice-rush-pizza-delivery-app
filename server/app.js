import "dotenv/config";
import ngrok from "ngrok";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

import webhooks from "./routes/webhooks.js";
import products from "./routes/products.js";
import users from "./routes/users.js";
import orders from "./routes/orders.js";
import auth from "./routes/auth.js";
import payments from "./routes/payments.js";
import mongooseErrorHandler from "./middlewares/mongooseErrorHandler.js";

mongoose.connect(process.env.CONNECTION_STRING, {dbName: 'slice-rush'})
.then(() => {
    console.log("Connected to database.");
    app.listen(PORT, () => {
        console.log(`Delivering pizzas on PORT ${PORT}`);

        // // get ngrok tunnel for server
        // ngrok.connect({addr: PORT, domain: "truly-stunning-macaque.ngrok-free.app"})
        // .then(url => console.log(`NGROK TUNNEL IN ${url}`))
        // .catch(err => console.log(err));
    });
})
.catch(err => console.log(err));

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors({
    origin: process.env.VITE_ORIGIN,
    credentials: true
}));

app.use("/webhooks", webhooks);

app.use(express.json());
app.use(cookieParser());

app.use("/products", products);
app.use("/users", users);
app.use("/orders", orders);
app.use("/auth", auth);
app.use("/payments", payments);

app.use(mongooseErrorHandler);

app.use((err, req, res, next) => {
    console.log(err);
    if (!res.headersSent) res.status(err.code || err.statusCode || 500).json({errors: err.err || err});
});

