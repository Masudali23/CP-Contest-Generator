import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Dashboard from './pages/Dashboard.jsx'
import ContestPage from './pages/ContestPage.jsx'
import Home from './pages/Home.jsx'
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom'
import Setup from './pages/Setup.jsx'
import LandingPage from './pages/LandingPage.jsx'
import ContestHistoryPage from './pages/ContestHistoryPage.jsx'
import ReportHistoryPage from './pages/ReportHistoryPage.jsx'
import ContestReportPage from './pages/ContestReportPage.jsx'

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path='/' element={<Home/>} />
      <Route path='/setup' element={<Setup/>} />
      <Route path='/landingpage' element={<LandingPage/>} />
      <Route path='/dashboard' element={<Dashboard/>} />
      <Route path='/contest/:contestId' element={<ContestPage/>} />
      <Route path='/history' element={<ContestHistoryPage/>} />
      <Route path='/reports' element={<ReportHistoryPage/>} />
      <Route path='/report/:contestId' element={<ContestReportPage/>} />
    </>
  )
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />   
  </StrictMode>,
)
