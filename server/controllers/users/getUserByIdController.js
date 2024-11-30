import Users from "../../models/user.js";

export default async function getUserByIdController(req, res){
    const user = await Users.findById({_id: req.params.userId}, {password: 0});
    res.json(user);
}