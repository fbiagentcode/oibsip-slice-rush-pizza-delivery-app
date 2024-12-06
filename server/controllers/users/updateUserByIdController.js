import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

import Users from "../../models/user.js";
export default async function updateUserByIdController(req, res, next){
    try{
        const { user, params: {userId: id} } = req;
        const update = req.body;

        if (user.role === "admin" || user._id === id){
            // check if user exists
            const existingUser = await Users.findById(id);
            if (!existingUser) return next({err: "Could not find user", code: 404}); 

            // handle image updates
            const { file } = req;
            if (file){
                const bucketId = "images";
                const bucket = supabaseClient.storage.from(bucketId);
                const oldPath = existingUser.imageUrl?.split(bucketId + "/")[1];

                // replace img
                const { data, error } = await bucket.update(oldPath, file.buffer, { upsert: true });
                
                if (error) return next({err: error, code: 1*error.statusCode});
                
                const { data: {publicUrl} } = bucket.getPublicUrl(data.path);
                update.imageUrl = publicUrl;
            }
            const updatedUser = await Users.findByIdAndUpdate(id, update, { new: true });
            res.json(updatedUser);
            return console.log("Updated user details", updatedUser);
        }
        next({err: "Not authorized to update user's details.", code: 401});
    }
    catch(err){
        next(err);
    }
}