import { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import { useRouter } from "next/router";
import { supabase } from "../supabase";



const Home: NextPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter();

  const handleRegister = async (e: { preventDefault: () => void; }) => {
    e.preventDefault()
    const { data: user, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) {
      console.log(error)
    } else {
      console.log(user)
      // router.push('/profile')
    }
  }

  
  return (
    <form onSubmit={handleRegister}>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit">Register</button>
    </form>
  );
};

export default Home;
