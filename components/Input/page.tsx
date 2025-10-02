"use client";
import React, { useState } from "react";
import Input from "@/components/Input";
import { TitleL } from "@/components/atoms/Typography";
import CloudIcon from "@/app/assets/CloudIcon";

export default function InputPage() {
  const [inputValue, setInputValue] = useState("");
  return (
    <div className="w-full px-8 justify-center">
      <div className="bg-[#F1F3F5] w-10/12 h-[136px] flex justify-start items-center rounded-xl px-10 m-auto">
        <TitleL fontWeight="extrabold">Fields (Component)</TitleL>
      </div>
      <div className="grid grid-cols-3 mt-6 w-10/12 m-auto px-10">
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value={inputValue}
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value="Field text"
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              disabled={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value={inputValue}
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              error={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value="Field text"
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              error={true}
              disabled={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value={inputValue}
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value="Field Text"
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value="Field Text"
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled={false}
              error={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value="Field Text"
              setFormValue={setInputValue}
              required={false}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled={true}
              error={true}
            />
          </div>
        </div>
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value={inputValue}
              setFormValue={setInputValue}
              required={false}
              errorText="Error text"
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value="Field text"
              setFormValue={setInputValue}
              required={false}
              errorText="Error text"
              disabled={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value={inputValue}
              setFormValue={setInputValue}
              required={false}
              errorText="Error text"
              error={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value="Field text"
              setFormValue={setInputValue}
              required={false}
              errorText="Error text"
              error={true}
              disabled={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value={inputValue}
              setFormValue={setInputValue}
              required={false}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value="Field Text"
              setFormValue={setInputValue}
              required={false}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value="Field Text"
              setFormValue={setInputValue}
              required={false}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled={false}
              error={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              labelText="Label Text"
              placeholderText="Field Text"
              type="email"
              value="Field Text"
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled={true}
              error={true}
            />
          </div>
        </div>
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="h-28 flex justify-center items-center">
            <Input
              placeholderText="Field Text"
              type="email"
              value={inputValue}
              setFormValue={setInputValue}
              required={false}
              errorText="Error text"
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              placeholderText="Field Text"
              type="email"
              value="Field text"
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              disabled={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              placeholderText="Field Text"
              type="email"
              value={inputValue}
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              error={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              placeholderText="Field Text"
              type="email"
              value="Field text"
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              error={true}
              disabled={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              placeholderText="Field Text"
              type="email"
              value={inputValue}
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              placeholderText="Field Text"
              type="email"
              value="Field Text"
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              placeholderText="Field Text"
              type="email"
              value="Field Text"
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled={false}
              error={true}
            />
          </div>
          <div className="h-28 flex justify-center items-center">
            <Input
              placeholderText="Field Text"
              type="email"
              value="Field Text"
              setFormValue={setInputValue}
              required={true}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled={true}
              error={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
