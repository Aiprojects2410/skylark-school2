import{d as r,j as e}from"./index-DSXzeSih.js";import{M as i}from"./Modal-yQ_4DsFW.js";import{P as c}from"./printer-CLVcJu_7.js";import{D as d}from"./download-Cq1S5CUt.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=r("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);function f({credentials:s,onClose:a,title:o="Student login created"}){const n=`Skylark School — Login

Username: ${s.username}
Email: ${s.email}
Temporary Password: ${s.temp_password}

Please change your password after first login.`;return e.jsx(i,{title:o,onClose:a,children:e.jsxs("div",{className:"p-5",children:[e.jsx("p",{className:"text-sm text-slate-500",children:"Save these now — the password won't be shown again. The student must change it on first login."}),e.jsxs("dl",{className:"mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("dt",{className:"text-slate-500",children:"Username"}),e.jsx("dd",{className:"font-mono font-semibold",children:s.username})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("dt",{className:"text-slate-500",children:"Email"}),e.jsx("dd",{className:"font-mono font-semibold",children:s.email})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("dt",{className:"text-slate-500",children:"Temporary password"}),e.jsx("dd",{className:"font-mono font-semibold",children:s.temp_password})]})]}),e.jsxs("div",{className:"mt-5 flex flex-wrap gap-2",children:[e.jsxs("button",{onClick:()=>navigator.clipboard.writeText(n),className:"btn-secondary",children:[e.jsx(m,{size:15})," Copy"]}),e.jsxs("button",{onClick:()=>window.print(),className:"btn-secondary",children:[e.jsx(c,{size:15})," Print"]}),e.jsxs("button",{onClick:()=>{const l=new Blob([n],{type:"text/plain"}),t=document.createElement("a");t.href=URL.createObjectURL(l),t.download=`${s.username}-login.txt`,t.click()},className:"btn-secondary",children:[e.jsx(d,{size:15})," Download"]})]}),e.jsx("button",{onClick:a,className:"btn-primary mt-5 w-full justify-center",children:"Done"})]})})}export{f as C};
