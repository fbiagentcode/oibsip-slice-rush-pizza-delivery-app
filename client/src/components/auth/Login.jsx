import { useState, useEffect, useContext, useRef } from "react";

import { authContext } from "../../contexts/AuthContext";
import useFetch from "../../hooks/useFetch";

import { Card, CardHeader, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import ButtonLoading from "../ui/ButtonLoading";
import InputWithLabel from "../ui/InputWithLabel";

const origin = import.meta.env.VITE_ORIGIN;

export default function Login(){
    const { dispatch } = useContext(authContext);
    const { fetchHandler, isLoading, error } = useFetch();
    const controller = useRef();
    const [ email, setEmail ] = useState("");
    const [ password, setPassword ] = useState("");

    const login = async () => {
        const user = await fetchHandler(`${origin}/auth/login`, controller.current.signal,
            {
                method: "POST",
                body: JSON.stringify({ email, password }),
                headers: { "Content-Type": "application/json" }
            }
        );
        // test
        // console.log("user login, error", user, error);
        if (user) dispatch({type: "LOGIN", payload: user});
    };

    useEffect(() => {
        controller.current = new AbortController();

        return () => controller.current.abort();
    }, []);

    // test effects
    useEffect(() => console.log("email", email, password), [email, password]);

    return <Card>
        <CardHeader>LOGIN</CardHeader>
        <CardContent>
            <InputWithLabel 
                type="email"
                fieldName= "Email"
                fieldValue= {email} 
                setField= {setEmail}
                required
            />
            <InputWithLabel 
                type="password"
                fieldName= "Password"
                fieldValue= {password} 
                setField= {setPassword}
                required
                />     
            { error?.errors && <p>{error.errors}</p> }
        </CardContent>
        <CardFooter>
            { isLoading? <ButtonLoading/> :
            <Button onClick= { () => login() }>Login</Button> }
            <hr/>
            <p>OR</p>
            <p>Don't have an account? </p>
            <Button>Sign Up</Button>
        </CardFooter>
    </Card>
}