"use client";
import axios from "axios";
import { useState } from "react";

const Page = () => {
  const [nickname, setNickname] = useState<string>("");
  const [responseData, setResponseData] = useState<string | null>(null);

  const handleAnalyze = async () => {
    try {
      const response = await axios.post(`http://localhost:4000/analyze`, {
        username: nickname,
      });

      setResponseData(JSON.stringify(response.data));
    } catch (error) {
      setResponseData("Error fetching data:" + JSON.stringify(error));
    }
  };

  const handlePortrait = async () => {
    try {
      const response = await axios.post(`http://localhost:4000/portrait`, {
        username: nickname,
      });

      setResponseData(JSON.stringify(response.data)); // Предполагаем, что сервер возвращает массив слов
    } catch (error) {
      setResponseData("Error fetching data:" + JSON.stringify(error));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <h1 className="text-3xl font-bold mb-6">Nickname Analyzer</h1>
      <input
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Введите никнейм"
        className="p-2 border border-gray-300 rounded-md mb-4 w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex space-x-4">
        <button
          onClick={handleAnalyze}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-200"
        >
          Analyze
        </button>
        <button
          onClick={handlePortrait}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-200"
        >
          Portrait
        </button>
      </div>
      {responseData && (
        <div className="mt-6 p-4 bg-gray-800 border border-gray-800 rounded-md shadow-md">
          <h2 className="text-xl font-semibold">Результаты:</h2>
          <p>{responseData}</p>
        </div>
      )}
    </div>
  );
};

export default Page;
