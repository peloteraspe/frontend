'use client';
import React, { useState } from 'react';
import Input from '@/components/Input';
import { TitleL } from '@/components/atoms/Typography';
import CloudIcon from '@/app/assets/CloudIcon';

export default function InputPage() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="w-full px-8 justify-center">
      <div className="bg-[#F1F3F5] w-10/12 h-[136px] flex justify-start items-center rounded-xl px-10 m-auto">
        <TitleL fontWeight="extrabold">Fields (Component)</TitleL>
      </div>

      <div className="grid grid-cols-3 mt-6 w-10/12 m-auto px-10">
        {/* Columna 1 */}
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              required
              errorText="Error text"
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              defaultValue="Field text"
              required
              errorText="Error text"
              disabled
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              required
              errorText="Error text"
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              defaultValue="Field text"
              required
              errorText="Error text"
              disabled
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              required
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              defaultValue="Field Text"
              required
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled
            />
          </div>
        </div>

        {/* Columna 2 */}
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              required={false}
              errorText="Error text"
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              defaultValue="Field text"
              errorText="Error text"
              disabled
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              errorText="Error text"
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              defaultValue="Field text"
              errorText="Error text"
              disabled
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              label="Label Text"
              placeholder="Field Text"
              type="email"
              defaultValue="Field Text"
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled
            />
          </div>
        </div>

        {/* Columna 3 */}
        <div className="col-span-1 flex flex-col justify-center items-center">
          <div className="h-28 flex justify-center items-center">
            <Input
              placeholder="Field Text"
              type="email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              errorText="Error text"
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              placeholder="Field Text"
              type="email"
              defaultValue="Field text"
              required
              errorText="Error text"
              disabled
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              placeholder="Field Text"
              type="email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              required
              errorText="Error text"
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              placeholder="Field Text"
              type="email"
              defaultValue="Field text"
              required
              errorText="Error text"
              disabled
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              placeholder="Field Text"
              type="email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              required
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
            />
          </div>

          <div className="h-28 flex justify-center items-center">
            <Input
              placeholder="Field Text"
              type="email"
              defaultValue="Field Text"
              required
              errorText="Error text"
              icon={<CloudIcon color="grayIcon" />}
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  );
}
