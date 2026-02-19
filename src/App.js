import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ── Constants ───────────────────────────────────────────────────────────────
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4'];
const PRIORITIES = ['Critical','High','Medium','Low'];
const PRIORITY_COLORS = { Critical:'#f43f5e', High:'#f97316', Medium:'#eab308', Low:'#6366f1' };
const STATUSES = ['Not Started','In Progress','Review','Completed','Blocked'];
const STATUS_COLORS = { 'Not Started':'#64748b','In Progress':'#3b82f6','Review':'#a855f7','Completed':'#22c55e','Blocked':'#f43f5e' };
const RECURRENCE = ['None','Daily','Weekly','Bi-Weekly','Monthly','Quarterly','Yearly'];
const VIEWS = ['List','Board','Timeline'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?';
  const hue = name ? name.charCodeAt(0) * 37 % 360 : 200;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`hsl(${hue},60%,50%)`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.36, fontWeight:700, color:'#fff', flexShrink:0,
      border:'2px solid rgba(255,255,255,0.15)' }}>{initials}</div>
  );
}

function Badge({ label, color, small }) {
  return (
    <span style={{ background:color+'22', color, border:`1px solid ${color}44`,
      padding: small ? '1px 6px':'2px 9px', borderRadius:99,
      fontSize: small?10:11, fontWeight:600, whiteSpace:'nowrap' }}>{label}</span>
  );
}

function Modal({ open, onClose, title, children, width=480 }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)',
      zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#1a1d2e', border:'1px solid #2a2d3e', borderRadius:16,
        width:'100%', maxWidth:width, maxHeight:'90vh', overflow:'auto',
        boxShadow:'0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ padding:'20px 24px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'#e2e8f0' }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:22, lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

function FInput({ label, value, onChange, type='text', placeholder }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#94a3b8', marginBottom:5, textTransform:'uppercase', letterSpacing:0.8 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', background:'#0f1117', border:'1px solid #2a2d3e', borderRadius:8,
          padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }}
        onFocus={e => e.target.style.borderColor='#6366f1'}
        onBlur={e => e.target.style.borderColor='#2a2d3e'} />
    </div>
  );
}

function FSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#94a3b8', marginBottom:5, textTransform:'uppercase', letterSpacing:0.8 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width:'100%', background:'#0f1117', border:'1px solid #2a2d3e', borderRadius:8,
          padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none', cursor:'pointer' }}>
        {options.map(o => <option key={typeof o==='string'?o:o.value} value={typeof o==='string'?o:o.value}>{typeof o==='string'?o:o.label}</option>)}
      </select>
    </div>
  );
}

function FTextarea({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#94a3b8', marginBottom:5, textTransform:'uppercase', letterSpacing:0.8 }}>{label}</label>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
        style={{ width:'100%', background:'#0f1117', border:'1px solid #2a2d3e', borderRadius:8,
          padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none', resize:'vertical',
          boxSizing:'border-box', fontFamily:'inherit' }} />
    </div>
  );
}

function Spinner() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#6366f1', fontSize:13 }}>
    <div style={{ animation:'spin 1s linear infinite', width:24, height:24, borderRadius:'50%',
      border:'3px solid #1a1d2e', borderTopColor:'#6366f1', marginRight:10 }}/>
    Loading...
  </div>;
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [depts, setDepts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedDept, setSelectedDept] = useState(null);
  const [view, setView] = useState('List');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Modals
  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deptModal, setDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null); // null=new, obj=edit
  const [deptParentId, setDeptParentId] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [memberModal, setMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const emptyTask = { title:'', description:'', dept_id:'', status:'Not Started', priority:'Medium', assignee:'', due_date:'', recurrence:'None', tags:'' };
  const emptyDept = { name:'', color:COLORS[0], icon:'📁' };
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [deptForm, setDeptForm] = useState(emptyDept);

  // ── Fetch Data ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: deptsData, error: de }, { data: tasksData, error: te }, { data: membersData, error: me }] = await Promise.all([
        supabase.from('departments').select('*').order('created_at'),
        supabase.from('tasks').select('*, subtasks(*), comments(*)').order('created_at'),
        supabase.from('members').select('*').order('name'),
      ]);
      if (de) throw de;
      if (te) throw te;
      if (me) throw me;
      setDepts(deptsData || []);
      setTasks(tasksData || []);
      setMembers(membersData || []);
    } catch (err) {
      setError('Could not connect to database. Check your Supabase credentials in .env');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Real-time subscriptions
  useEffect(() => {
    const taskSub = supabase.channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchAll)
      .subscribe();
    const deptSub = supabase.channel('dept-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(taskSub); supabase.removeChannel(deptSub); };
  }, [fetchAll]);

  // ── Dept helpers ────────────────────────────────────────────────────────────
  const topDepts = depts.filter(d => !d.parent_id);
  const subDepts = (parentId) => depts.filter(d => d.parent_id === parentId);

  const getDeptName = (id) => {
    const d = depts.find(x => x.id === id);
    if (!d) return 'Unknown';
    if (d.parent_id) {
      const parent = depts.find(x => x.id === d.parent_id);
      return parent ? `${parent.name} › ${d.name}` : d.name;
    }
    return d.name;
  };
  const getDeptColor = (id) => depts.find(d => d.id === id)?.color || '#64748b';

  // ── Task CRUD ───────────────────────────────────────────────────────────────
  const openNewTask = () => {
    setEditingTask(null);
    setTaskForm({ ...emptyTask, dept_id: selectedDept || depts[0]?.id || '' });
    setTaskModal(true);
  };
  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({ ...task, tags: (task.tags || []).join(', '), due_date: task.due_date || '' });
    setTaskModal(true);
  };
  const saveTask = async () => {
    if (!taskForm.title.trim()) return;
    const payload = { ...taskForm, tags: taskForm.tags.split(',').map(x => x.trim()).filter(Boolean) };
    delete payload.subtasks; delete payload.comments; delete payload.id; delete payload.created_at; delete payload.updated_at;
    if (editingTask) {
      await supabase.from('tasks').update(payload).eq('id', editingTask.id);
    } else {
      await supabase.from('tasks').insert(payload);
    }
    setTaskModal(false);
    fetchAll();
  };
  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    if (taskDetail?.id === id) setTaskDetail(null);
    fetchAll();
  };
  const updateTaskStatus = async (id, status) => {
    await supabase.from('tasks').update({ status }).eq('id', id);
    setTaskDetail(prev => prev?.id === id ? { ...prev, status } : prev);
    fetchAll();
  };

  // ── Dept CRUD ───────────────────────────────────────────────────────────────
  const openNewDept = (parentId = null) => {
    setEditingDept(null);
    setDeptParentId(parentId);
    setDeptForm({ ...emptyDept, color: COLORS[depts.length % COLORS.length] });
    setDeptModal(true);
  };
  const openEditDept = (dept) => {
    setEditingDept(dept);
    setDeptParentId(dept.parent_id || null);
    setDeptForm({ name: dept.name, color: dept.color, icon: dept.icon || '📁' });
    setDeptModal(true);
  };
  const saveDept = async () => {
    if (!deptForm.name.trim()) return;
    const payload = { name: deptForm.name, color: deptForm.color, icon: deptForm.icon, parent_id: deptParentId };
    if (editingDept) {
      await supabase.from('departments').update(payload).eq('id', editingDept.id);
    } else {
      await supabase.from('departments').insert(payload);
    }
    setDeptModal(false);
    fetchAll();
  };
  const deleteDept = async (id) => {
    await supabase.from('departments').delete().eq('id', id);
    if (selectedDept === id) setSelectedDept(null);
    fetchAll();
  };

  // ── Subtask & Comment CRUD ──────────────────────────────────────────────────
  const addSubtask = async (taskId, title) => {
    if (!title.trim()) return;
    await supabase.from('subtasks').insert({ task_id: taskId, title });
    fetchAll();
    setTaskDetail(prev => prev ? { ...prev, subtasks: [...(prev.subtasks||[]), { id:'tmp'+Date.now(), title, done:false }] } : prev);
  };
  const toggleSubtask = async (subId, done) => {
    await supabase.from('subtasks').update({ done: !done }).eq('id', subId);
    fetchAll();
    setTaskDetail(prev => prev ? { ...prev, subtasks: prev.subtasks.map(s => s.id===subId ? {...s,done:!s.done} : s) } : prev);
  };
  const addComment = async (taskId, text) => {
    if (!text.trim()) return;
    await supabase.from('comments').insert({ task_id: taskId, text, author: 'Team Member' });
    fetchAll();
  };

  // ── Members ─────────────────────────────────────────────────────────────────
  const addMember = async () => {
    if (!newMemberName.trim()) return;
    await supabase.from('members').insert({ name: newMemberName.trim() });
    setNewMemberName('');
    fetchAll();
  };
  const deleteMember = async (id) => {
    await supabase.from('members').delete().eq('id', id);
    fetchAll();
  };

  // ── Filter tasks ─────────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter(t => {
    const deptMatch = !selectedDept || t.dept_id === selectedDept;
    const searchMatch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.assignee||'').toLowerCase().includes(search.toLowerCase());
    const statusMatch = filterStatus==='All' || t.status===filterStatus;
    const priorityMatch = filterPriority==='All' || t.priority===filterPriority;
    return deptMatch && searchMatch && statusMatch && priorityMatch;
  });

  const scopedTasks = selectedDept ? tasks.filter(t => t.dept_id === selectedDept) : tasks;
  const completedCount = scopedTasks.filter(t => t.status==='Completed').length;
  const progress = scopedTasks.length ? Math.round(completedCount/scopedTasks.length*100) : 0;

  const deptOptions = [];
  topDepts.forEach(d => {
    deptOptions.push({ value: d.id, label: d.name });
    subDepts(d.id).forEach(s => deptOptions.push({ value: s.id, label: `  └ ${s.name}` }));
  });

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#080a12', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ background:'#1a1d2e', border:'1px solid #f43f5e44', borderRadius:16, padding:32, maxWidth:500, textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
        <h2 style={{ color:'#f43f5e', marginBottom:8 }}>Database Not Connected</h2>
        <p style={{ color:'#94a3b8', fontSize:13, lineHeight:1.7 }}>{error}</p>
        <p style={{ color:'#64748b', fontSize:12, marginTop:16 }}>See the README.md for setup instructions.</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#080a12', color:'#e2e8f0', fontFamily:"'DM Sans','Segoe UI',sans-serif", display:'flex', overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#2a2d3e; border-radius:4px; }
        button { cursor:pointer; font-family:inherit; }
        input,select,textarea { font-family:inherit; }
        .task-row:hover { background:#1a1d2e !important; }
        .dept-item:hover .dept-actions { opacity:1 !important; }
        .task-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.4) !important; }
        .btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; padding:9px 18px; border-radius:8px; font-weight:600; font-size:13px; transition:opacity .2s,transform .1s; }
        .btn-primary:hover { opacity:.9; transform:scale(1.02); }
        .btn-ghost { background:transparent; border:1px solid #2a2d3e; color:#94a3b8; padding:7px 14px; border-radius:8px; font-size:12px; font-weight:500; transition:all .2s; }
        .btn-ghost:hover { background:#1a1d2e; color:#e2e8f0; border-color:#3a3d4e; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{ width:sidebarOpen?250:60, transition:'width .25s ease', background:'#0d0f1a', borderRight:'1px solid #1a1d2e', display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
        {/* Logo */}
        <div style={{ padding:'16px 14px', borderBottom:'1px solid #1a1d2e', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:9,flexShrink:0,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>⚡</div>
          {sidebarOpen && <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,letterSpacing:-0.3 }}>FlowDesk</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ marginLeft:'auto',background:'none',border:'none',color:'#64748b',fontSize:16,flexShrink:0 }}>{sidebarOpen?'◀':'▶'}</button>
        </div>

        {/* All Tasks */}
        <div style={{ padding:'8px 8px 0' }}>
          <SidebarBtn icon="🏠" label="All Tasks" active={selectedDept===null} onClick={() => setSelectedDept(null)} open={sidebarOpen} count={tasks.length} />
        </div>

        {/* Departments */}
        <div style={{ flex:1, overflow:'auto', padding:'0 8px 8px' }}>
          {sidebarOpen && (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 4px 4px',marginBottom:2 }}>
              <span style={{ fontSize:10,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:1 }}>Departments</span>
              <button onClick={() => openNewDept()} style={{ background:'none',border:'none',color:'#6366f1',fontSize:18,lineHeight:1 }}>+</button>
            </div>
          )}

          {loading && sidebarOpen ? <div style={{ color:'#475569',fontSize:12,padding:'8px 4px' }}>Loading...</div> : null}

          {topDepts.map(dept => (
            <div key={dept.id} className="dept-item" style={{ position:'relative' }}>
              <div style={{ display:'flex',alignItems:'center' }}>
                <button onClick={() => setSelectedDept(dept.id)} style={{
                  flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,border:'none',
                  background:selectedDept===dept.id?'#1a1d2e':'transparent',
                  color:selectedDept===dept.id?'#e2e8f0':'#94a3b8',
                  fontSize:13,fontWeight:500,transition:'all .15s',textAlign:'left'
                }}>
                  <span style={{ width:8,height:8,borderRadius:'50%',background:dept.color,flexShrink:0,boxShadow:`0 0 6px ${dept.color}80` }}/>
                  {sidebarOpen && <><span style={{ fontSize:14 }}>{dept.icon}</span><span style={{ flex:1 }}>{dept.name}</span></>}
                </button>
                {sidebarOpen && (
                  <div className="dept-actions" style={{ opacity:0,transition:'opacity .15s',display:'flex',gap:2,paddingRight:4,flexShrink:0 }}>
                    <button onClick={() => openNewDept(dept.id)} title="Add sub-dept" style={{ background:'none',border:'none',color:'#6366f1',fontSize:13,padding:'2px 4px' }}>+</button>
                    <button onClick={() => openEditDept(dept)} title="Edit" style={{ background:'none',border:'none',color:'#94a3b8',fontSize:12,padding:'2px 4px' }}>✏️</button>
                    <button onClick={() => deleteDept(dept.id)} title="Delete" style={{ background:'none',border:'none',color:'#f43f5e',fontSize:12,padding:'2px 4px' }}>✕</button>
                  </div>
                )}
              </div>

              {/* Sub-departments */}
              {sidebarOpen && subDepts(dept.id).map(sub => (
                <div key={sub.id} className="dept-item" style={{ display:'flex',alignItems:'center' }}>
                  <button onClick={() => setSelectedDept(sub.id)} style={{
                    flex:1,display:'flex',alignItems:'center',gap:8,padding:'5px 10px 5px 26px',borderRadius:8,border:'none',
                    background:selectedDept===sub.id?'#1a1d2e':'transparent',
                    color:selectedDept===sub.id?'#e2e8f0':'#64748b',
                    fontSize:12,fontWeight:400,transition:'all .15s',textAlign:'left'
                  }}>
                    <span style={{ width:6,height:6,borderRadius:'50%',background:sub.color,flexShrink:0 }}/>
                    <span style={{ flex:1 }}>{sub.name}</span>
                  </button>
                  <div className="dept-actions" style={{ opacity:0,transition:'opacity .15s',display:'flex',gap:2,paddingRight:4,flexShrink:0 }}>
                    <button onClick={() => openEditDept(sub)} title="Edit" style={{ background:'none',border:'none',color:'#94a3b8',fontSize:12,padding:'2px 4px' }}>✏️</button>
                    <button onClick={() => deleteDept(sub.id)} title="Delete" style={{ background:'none',border:'none',color:'#f43f5e',fontSize:12,padding:'2px 4px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Team section */}
        {sidebarOpen && (
          <div style={{ borderTop:'1px solid #1a1d2e', padding:12 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
              <div style={{ fontSize:10,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:1 }}>Team</div>
              <button onClick={() => setMemberModal(true)} style={{ background:'none',border:'none',color:'#6366f1',fontSize:16,lineHeight:1 }}>+</button>
            </div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
              {members.slice(0,8).map(m => <Avatar key={m.id} name={m.name} size={26}/>)}
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #1a1d2e', display:'flex', alignItems:'center', gap:12, background:'#0d0f1a', flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:17, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif", letterSpacing:-0.3 }}>
              {selectedDept ? getDeptName(selectedDept) : 'All Tasks'}
            </h1>
            <div style={{ fontSize:11, color:'#475569', marginTop:1 }}>
              {completedCount}/{scopedTasks.length} tasks completed
              {scopedTasks.length > 0 && <span style={{ marginLeft:8, color:'#6366f1' }}>{progress}%</span>}
            </div>
          </div>

          <div style={{ width:100, height:4, background:'#1a1d2e', borderRadius:99, overflow:'hidden' }}>
            <div style={{ width:`${progress}%`, height:'100%', background:'linear-gradient(90deg,#6366f1,#22c55e)', transition:'width .5s' }}/>
          </div>

          <div style={{ display:'flex', background:'#0f1117', border:'1px solid #1a1d2e', borderRadius:8, padding:2, gap:1 }}>
            {VIEWS.map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding:'5px 10px', borderRadius:6, border:'none', fontSize:11, fontWeight:600,
                background:view===v?'#1a1d2e':'transparent',
                color:view===v?'#e2e8f0':'#475569', transition:'all .15s'
              }}>{v}</button>
            ))}
          </div>

          <button className="btn-primary" onClick={openNewTask}>+ New Task</button>
        </div>

        {/* Filters */}
        <div style={{ padding:'10px 20px', borderBottom:'1px solid #1a1d2e', display:'flex', alignItems:'center', gap:8, flexShrink:0, background:'#080a12' }}>
          <div style={{ position:'relative', flex:1, maxWidth:280 }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#475569' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks or assignee..."
              style={{ width:'100%', background:'#0f1117', border:'1px solid #1a1d2e', borderRadius:8, padding:'7px 10px 7px 30px', color:'#e2e8f0', fontSize:12, outline:'none' }}/>
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background:'#0f1117', border:'1px solid #1a1d2e', borderRadius:8, padding:'7px 10px', color:'#94a3b8', fontSize:12, outline:'none' }}>
            <option value="All">All Status</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ background:'#0f1117', border:'1px solid #1a1d2e', borderRadius:8, padding:'7px 10px', color:'#94a3b8', fontSize:12, outline:'none' }}>
            <option value="All">All Priority</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <span style={{ fontSize:11, color:'#475569', marginLeft:'auto' }}>{filteredTasks.length} tasks</span>
          {loading && <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid #1a1d2e', borderTopColor:'#6366f1', animation:'spin 1s linear infinite' }}/>}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'auto', padding:20 }}>
          {loading && tasks.length===0 ? <Spinner/> : (
            <>
              {view==='Board' && <BoardView tasks={filteredTasks} onClickTask={setTaskDetail} onStatusChange={updateTaskStatus} getDeptColor={getDeptColor} getDeptName={getDeptName}/>}
              {view==='List' && <ListView tasks={filteredTasks} onClickTask={setTaskDetail} onEdit={openEditTask} onDelete={deleteTask} onStatusChange={updateTaskStatus} getDeptColor={getDeptColor} getDeptName={getDeptName}/>}
              {view==='Timeline' && <TimelineView tasks={filteredTasks} onClickTask={setTaskDetail} getDeptColor={getDeptColor}/>}
            </>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      {/* Task Modal */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title={editingTask?'Edit Task':'New Task'} width={520}>
        <FInput label="Task Title *" value={taskForm.title} onChange={v => setTaskForm({...taskForm,title:v})} placeholder="What needs to be done?"/>
        <FTextarea label="Description" value={taskForm.description||''} onChange={v => setTaskForm({...taskForm,description:v})} placeholder="Add details..."/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FSelect label="Department" value={taskForm.dept_id||''} onChange={v => setTaskForm({...taskForm,dept_id:v})} options={deptOptions}/>
          <FSelect label="Status" value={taskForm.status} onChange={v => setTaskForm({...taskForm,status:v})} options={STATUSES}/>
          <FSelect label="Priority" value={taskForm.priority} onChange={v => setTaskForm({...taskForm,priority:v})} options={PRIORITIES}/>
          <FSelect label="Assignee" value={taskForm.assignee||''} onChange={v => setTaskForm({...taskForm,assignee:v})} options={[{value:'',label:'Unassigned'},...members.map(m=>({value:m.name,label:m.name}))]}/>
          <FInput label="Due Date" type="date" value={taskForm.due_date||''} onChange={v => setTaskForm({...taskForm,due_date:v})}/>
          <FSelect label="Recurrence" value={taskForm.recurrence||'None'} onChange={v => setTaskForm({...taskForm,recurrence:v})} options={RECURRENCE}/>
        </div>
        <FInput label="Tags (comma separated)" value={taskForm.tags||''} onChange={v => setTaskForm({...taskForm,tags:v})} placeholder="design, urgent, review"/>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
          <button className="btn-ghost" onClick={() => setTaskModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={saveTask}>{editingTask?'Update':'Create Task'}</button>
        </div>
      </Modal>

      {/* Dept Modal */}
      <Modal open={deptModal} onClose={() => setDeptModal(false)} title={editingDept?`Edit: ${editingDept.name}`:deptParentId?'New Sub-Department':'New Department'} width={400}>
        <FInput label="Name *" value={deptForm.name} onChange={v => setDeptForm({...deptForm,name:v})} placeholder="Department name"/>
        {!deptParentId && <FInput label="Icon (emoji)" value={deptForm.icon} onChange={v => setDeptForm({...deptForm,icon:v})} placeholder="📁"/>}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block',fontSize:11,fontWeight:600,color:'#94a3b8',marginBottom:8,textTransform:'uppercase',letterSpacing:0.8 }}>Color</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setDeptForm({...deptForm,color:c})} style={{ width:28,height:28,borderRadius:'50%',background:c,border:deptForm.color===c?'3px solid #fff':'3px solid transparent',transition:'border .15s' }}/>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn-ghost" onClick={() => setDeptModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={saveDept}>{editingDept?'Save Changes':'Create'}</button>
        </div>
      </Modal>

      {/* Member Modal */}
      <Modal open={memberModal} onClose={() => setMemberModal(false)} title="Manage Team Members" width={400}>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <input value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter') addMember(); }}
            placeholder="Full name..."
            style={{ flex:1, background:'#0f1117', border:'1px solid #2a2d3e', borderRadius:8, padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none' }}/>
          <button className="btn-primary" onClick={addMember}>Add</button>
        </div>
        <div style={{ maxHeight:300, overflow:'auto' }}>
          {members.map(m => (
            <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #1a1d2e' }}>
              <Avatar name={m.name} size={28}/>
              <span style={{ flex:1, fontSize:13, color:'#e2e8f0' }}>{m.name}</span>
              <button onClick={() => deleteMember(m.id)} style={{ background:'none',border:'none',color:'#f43f5e',fontSize:13,cursor:'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Task Detail Panel */}
      {taskDetail && (
        <TaskDetailPanel
          task={taskDetail}
          onClose={() => setTaskDetail(null)}
          onEdit={() => { openEditTask(taskDetail); setTaskDetail(null); }}
          onDelete={() => deleteTask(taskDetail.id)}
          onStatusChange={s => updateTaskStatus(taskDetail.id, s)}
          onAddComment={t => addComment(taskDetail.id, t)}
          onAddSubtask={t => addSubtask(taskDetail.id, t)}
          onToggleSubtask={(id, done) => toggleSubtask(id, done)}
          getDeptName={getDeptName} getDeptColor={getDeptColor}
        />
      )}
    </div>
  );
}

// ── Sidebar Button ────────────────────────────────────────────────────────────
function SidebarBtn({ icon, label, active, onClick, open, count }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', display:'flex', alignItems:'center', gap:8,
      padding:'8px 10px', borderRadius:8, border:'none',
      background:active?'#1a1d2e':'transparent',
      color:active?'#e2e8f0':'#94a3b8',
      fontSize:13, fontWeight:500, transition:'all .15s', textAlign:'left'
    }}>
      <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>
      {open && <><span style={{ flex:1 }}>{label}</span><span style={{ background:'#2a2d3e',borderRadius:99,fontSize:10,padding:'1px 6px',color:'#94a3b8' }}>{count}</span></>}
    </button>
  );
}

// ── Board View ────────────────────────────────────────────────────────────────
function BoardView({ tasks, onClickTask, onStatusChange, getDeptColor, getDeptName }) {
  return (
    <div style={{ display:'flex', gap:14, alignItems:'flex-start', overflowX:'auto', paddingBottom:8 }}>
      {STATUSES.map(status => {
        const col = tasks.filter(t => t.status===status);
        return (
          <div key={status} style={{ minWidth:240, flex:1, maxWidth:300 }}>
            <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:10,padding:'8px 12px',borderRadius:8,background:`${STATUS_COLORS[status]}15`,border:`1px solid ${STATUS_COLORS[status]}30` }}>
              <span style={{ width:8,height:8,borderRadius:'50%',background:STATUS_COLORS[status],boxShadow:`0 0 6px ${STATUS_COLORS[status]}` }}/>
              <span style={{ fontWeight:700,fontSize:12,color:STATUS_COLORS[status] }}>{status}</span>
              <span style={{ marginLeft:'auto',background:STATUS_COLORS[status]+'33',color:STATUS_COLORS[status],borderRadius:99,fontSize:10,padding:'1px 7px',fontWeight:700 }}>{col.length}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {col.map(t => (
                <div key={t.id} className="task-card" onClick={() => onClickTask(t)} style={{
                  background:'#0d0f1a', border:'1px solid #1a1d2e', borderRadius:10, padding:12,
                  cursor:'pointer', transition:'all .2s', borderLeft:`3px solid ${PRIORITY_COLORS[t.priority]||'#475569'}`,
                  position:'relative'
                }}>
                  <div style={{ fontSize:12,fontWeight:600,color:'#e2e8f0',marginBottom:6,lineHeight:1.4 }}>{t.title}</div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:6 }}>
                    <Badge label={t.priority} color={PRIORITY_COLORS[t.priority]} small/>
                    {t.recurrence!=='None' && <Badge label={`🔄 ${t.recurrence}`} color="#64748b" small/>}
                  </div>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                    {t.assignee ? <Avatar name={t.assignee} size={22}/> : <span/>}
                    {t.due_date && <span style={{ fontSize:10,color:'#475569' }}>{t.due_date}</span>}
                  </div>
                  <span style={{ width:6,height:6,borderRadius:'50%',background:getDeptColor(t.dept_id),position:'absolute',top:10,right:10 }}/>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
function ListView({ tasks, onClickTask, onEdit, onDelete, onStatusChange, getDeptColor, getDeptName }) {
  return (
    <div style={{ background:'#0d0f1a', border:'1px solid #1a1d2e', borderRadius:12, overflow:'hidden' }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 110px 110px 90px 120px 90px 80px',padding:'8px 16px',borderBottom:'1px solid #1a1d2e',fontSize:10,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:0.8 }}>
        <span>Task</span><span>Department</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due Date</span><span>Actions</span>
      </div>
      {tasks.length===0 && (
        <div style={{ padding:40,textAlign:'center',color:'#475569' }}>
          <div style={{ fontSize:32,marginBottom:8 }}>📋</div>
          <div style={{ fontSize:13 }}>No tasks found. Create one with "+ New Task"</div>
        </div>
      )}
      {tasks.map((t,i) => (
        <div key={t.id} className="task-row" style={{
          display:'grid',gridTemplateColumns:'1fr 110px 110px 90px 120px 90px 80px',
          padding:'10px 16px',borderBottom:i<tasks.length-1?'1px solid #12141f':'none',
          alignItems:'center',transition:'background .15s',background:'transparent'
        }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer' }} onClick={() => onClickTask(t)}>
            <span style={{ width:8,height:8,borderRadius:'50%',background:getDeptColor(t.dept_id),flexShrink:0 }}/>
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:'#e2e8f0' }}>{t.title}</div>
              <div style={{ display:'flex',gap:6,marginTop:2 }}>
                {t.recurrence!=='None' && <span style={{ fontSize:10,color:'#64748b' }}>🔄 {t.recurrence}</span>}
                {(t.subtasks||[]).length>0 && <span style={{ fontSize:10,color:'#64748b' }}>✓ {(t.subtasks||[]).filter(s=>s.done).length}/{t.subtasks.length}</span>}
                {(t.tags||[]).slice(0,2).map(tag => <span key={tag} style={{ fontSize:10,color:'#475569' }}>#{tag}</span>)}
              </div>
            </div>
          </div>
          <div style={{ fontSize:11,color:'#64748b' }}>{getDeptName(t.dept_id).split(' › ').pop()}</div>
          <div>
            <select value={t.status} onChange={e => { e.stopPropagation(); onStatusChange(t.id, e.target.value); }} style={{
              background:STATUS_COLORS[t.status]+'22',border:`1px solid ${STATUS_COLORS[t.status]}44`,
              color:STATUS_COLORS[t.status],borderRadius:6,padding:'3px 6px',fontSize:10,fontWeight:600,cursor:'pointer',maxWidth:100
            }}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><Badge label={t.priority} color={PRIORITY_COLORS[t.priority]} small/></div>
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            {t.assignee && <><Avatar name={t.assignee} size={20}/><span style={{ fontSize:11,color:'#94a3b8' }}>{t.assignee.split(' ')[0]}</span></>}
          </div>
          <div style={{ fontSize:11,color:t.due_date&&new Date(t.due_date)<new Date()&&t.status!=='Completed'?'#f43f5e':'#64748b' }}>
            {t.due_date||'—'}
          </div>
          <div style={{ display:'flex',gap:4 }}>
            <button onClick={() => onEdit(t)} className="btn-ghost" style={{ padding:'3px 8px',fontSize:10 }}>✏️</button>
            <button onClick={() => onDelete(t.id)} className="btn-ghost" style={{ padding:'3px 8px',fontSize:10,color:'#f43f5e' }}>🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Timeline View ─────────────────────────────────────────────────────────────
function TimelineView({ tasks, onClickTask, getDeptColor }) {
  const sorted = [...tasks].filter(t => t.due_date).sort((a,b) => new Date(a.due_date)-new Date(b.due_date));
  const noDate = tasks.filter(t => !t.due_date);
  const now = new Date();
  if (sorted.length===0) return (
    <div style={{ textAlign:'center',padding:60,color:'#475569' }}>
      <div style={{ fontSize:32,marginBottom:8 }}>📅</div>
      <div>No tasks with due dates</div>
    </div>
  );
  const minDate = new Date(sorted[0].due_date);
  const maxDate = new Date(sorted[sorted.length-1].due_date);
  const range = Math.max((maxDate-minDate)/(86400000),7);
  return (
    <div>
      <div style={{ background:'#0d0f1a',border:'1px solid #1a1d2e',borderRadius:12,padding:20,overflowX:'auto' }}>
        <div style={{ minWidth:600 }}>
          {sorted.map(t => {
            const d = new Date(t.due_date);
            const pos = (d-minDate)/(86400000)/range*90;
            const isOverdue = d<now && t.status!=='Completed';
            return (
              <div key={t.id} style={{ display:'flex',alignItems:'center',gap:12,marginBottom:10 }}>
                <div style={{ width:90,fontSize:11,color:'#64748b',flexShrink:0,textAlign:'right' }}>{t.due_date}</div>
                <div style={{ flex:1,height:32,background:'#12141f',borderRadius:6,position:'relative',cursor:'pointer' }} onClick={() => onClickTask(t)}>
                  <div style={{
                    position:'absolute',left:`${pos}%`,top:4,
                    background:isOverdue?'#f43f5e':getDeptColor(t.dept_id),
                    borderRadius:4,padding:'4px 10px',fontSize:11,fontWeight:600,color:'#fff',
                    whiteSpace:'nowrap',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',
                    boxShadow:isOverdue?'0 0 8px #f43f5e80':`0 0 8px ${getDeptColor(t.dept_id)}80`
                  }}>{t.title}</div>
                </div>
                <Badge label={t.status} color={STATUS_COLORS[t.status]} small/>
              </div>
            );
          })}
        </div>
      </div>
      {noDate.length>0 && <div style={{ marginTop:16,color:'#475569',fontSize:12 }}>+ {noDate.length} tasks without due dates</div>}
    </div>
  );
}

// ── Task Detail Panel ─────────────────────────────────────────────────────────
function TaskDetailPanel({ task, onClose, onEdit, onDelete, onStatusChange, onAddComment, onAddSubtask, onToggleSubtask, getDeptName, getDeptColor }) {
  const [commentText, setCommentText] = useState('');
  const [subtaskText, setSubtaskText] = useState('');
  const [tab, setTab] = useState('details');

  return (
    <div style={{ position:'fixed',right:0,top:0,bottom:0,width:400,background:'#0d0f1a',borderLeft:'1px solid #1a1d2e',zIndex:500,display:'flex',flexDirection:'column',boxShadow:'-10px 0 40px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px',borderBottom:'1px solid #1a1d2e',flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'flex-start',gap:8 }}>
          <span style={{ width:10,height:10,borderRadius:'50%',background:getDeptColor(task.dept_id),marginTop:5,flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:14,fontWeight:700,color:'#e2e8f0',lineHeight:1.4 }}>{task.title}</h2>
            <div style={{ fontSize:11,color:'#475569',marginTop:2 }}>{getDeptName(task.dept_id)}</div>
          </div>
          <div style={{ display:'flex',gap:4 }}>
            <button onClick={onEdit} className="btn-ghost" style={{ padding:'4px 8px',fontSize:11 }}>Edit</button>
            <button onClick={onDelete} className="btn-ghost" style={{ padding:'4px 8px',fontSize:11,color:'#f43f5e' }}>Delete</button>
            <button onClick={onClose} style={{ background:'none',border:'none',color:'#64748b',fontSize:20,lineHeight:1 }}>×</button>
          </div>
        </div>
        <div style={{ display:'flex',gap:4,flexWrap:'wrap',marginTop:12 }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => onStatusChange(s)} style={{
              padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',transition:'all .15s',
              background:task.status===s?STATUS_COLORS[s]+'33':STATUS_COLORS[s]+'11',
              color:STATUS_COLORS[s],borderColor:`${STATUS_COLORS[s]}${task.status===s?'88':'33'}`
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',borderBottom:'1px solid #1a1d2e',flexShrink:0 }}>
        {['details','subtasks','comments'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1,padding:'10px',border:'none',background:'transparent',
            color:tab===t?'#6366f1':'#475569',fontSize:12,fontWeight:600,
            borderBottom:tab===t?'2px solid #6366f1':'2px solid transparent',
            textTransform:'capitalize',transition:'all .15s'
          }}>
            {t}{t==='subtasks'&&(task.subtasks||[]).length>0?` (${task.subtasks.length})`:''}{t==='comments'&&(task.comments||[]).length>0?` (${task.comments.length})`:''}
          </button>
        ))}
      </div>

      <div style={{ flex:1,overflow:'auto',padding:20 }}>
        {tab==='details' && (
          <div>
            {task.description && <div style={{ fontSize:13,color:'#94a3b8',marginBottom:16,lineHeight:1.6,padding:12,background:'#12141f',borderRadius:8 }}>{task.description}</div>}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
              {[
                {label:'Priority',value:<Badge label={task.priority} color={PRIORITY_COLORS[task.priority]}/>},
                {label:'Status',value:<Badge label={task.status} color={STATUS_COLORS[task.status]}/>},
                {label:'Assignee',value:task.assignee?<div style={{ display:'flex',alignItems:'center',gap:6 }}><Avatar name={task.assignee} size={22}/><span style={{ fontSize:12,color:'#94a3b8' }}>{task.assignee}</span></div>:<span style={{ color:'#475569',fontSize:12 }}>Unassigned</span>},
                {label:'Due Date',value:<span style={{ fontSize:12,color:task.due_date&&new Date(task.due_date)<new Date()&&task.status!=='Completed'?'#f43f5e':'#94a3b8' }}>{task.due_date||'Not set'}</span>},
                {label:'Recurrence',value:<span style={{ fontSize:12,color:'#94a3b8' }}>{task.recurrence==='None'?'—':task.recurrence}</span>},
              ].map(({label,value}) => (
                <div key={label} style={{ background:'#12141f',borderRadius:8,padding:10 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:0.8,marginBottom:5 }}>{label}</div>
                  {value}
                </div>
              ))}
            </div>
            {(task.tags||[]).length>0 && (
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:10,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:0.8,marginBottom:6 }}>Tags</div>
                <div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>
                  {task.tags.map(tag => <span key={tag} style={{ background:'#1a1d2e',border:'1px solid #2a2d3e',borderRadius:99,padding:'2px 8px',fontSize:10,color:'#94a3b8' }}>#{tag}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==='subtasks' && (
          <div>
            <div style={{ display:'flex',gap:6,marginBottom:12 }}>
              <input value={subtaskText} onChange={e => setSubtaskText(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'){ onAddSubtask(subtaskText); setSubtaskText(''); }}}
                placeholder="Add subtask..." style={{ flex:1,background:'#12141f',border:'1px solid #2a2d3e',borderRadius:8,padding:'8px 10px',color:'#e2e8f0',fontSize:12,outline:'none' }}/>
              <button className="btn-primary" style={{ padding:'8px 12px' }} onClick={() => { onAddSubtask(subtaskText); setSubtaskText(''); }}>Add</button>
            </div>
            {(task.subtasks||[]).length===0 && <div style={{ color:'#475569',fontSize:13,textAlign:'center',padding:20 }}>No subtasks yet</div>}
            {(task.subtasks||[]).map(s => (
              <div key={s.id} onClick={() => onToggleSubtask(s.id, s.done)} style={{
                display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,marginBottom:4,
                cursor:'pointer',background:'#12141f',border:'1px solid #1a1d2e',transition:'all .15s'
              }}>
                <span style={{ width:16,height:16,borderRadius:4,flexShrink:0,background:s.done?'#22c55e':'transparent',border:s.done?'2px solid #22c55e':'2px solid #475569',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff' }}>{s.done?'✓':''}</span>
                <span style={{ fontSize:12,color:s.done?'#475569':'#e2e8f0',textDecoration:s.done?'line-through':'none' }}>{s.title}</span>
              </div>
            ))}
            {(task.subtasks||[]).length>0 && (
              <div style={{ marginTop:12 }}>
                <div style={{ height:4,background:'#1a1d2e',borderRadius:99 }}>
                  <div style={{ width:`${(task.subtasks.filter(s=>s.done).length/task.subtasks.length)*100}%`,height:'100%',background:'#22c55e',borderRadius:99,transition:'width .3s' }}/>
                </div>
                <div style={{ fontSize:10,color:'#475569',marginTop:4 }}>{task.subtasks.filter(s=>s.done).length}/{task.subtasks.length} done</div>
              </div>
            )}
          </div>
        )}

        {tab==='comments' && (
          <div>
            {(task.comments||[]).map(c => (
              <div key={c.id} style={{ marginBottom:12,padding:10,background:'#12141f',borderRadius:8,border:'1px solid #1a1d2e' }}>
                <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:6 }}>
                  <Avatar name={c.author} size={20}/>
                  <span style={{ fontSize:11,fontWeight:600,color:'#94a3b8' }}>{c.author}</span>
                  <span style={{ fontSize:10,color:'#475569',marginLeft:'auto' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize:12,color:'#cbd5e1',lineHeight:1.5 }}>{c.text}</div>
              </div>
            ))}
            {(task.comments||[]).length===0 && <div style={{ color:'#475569',fontSize:13,textAlign:'center',padding:20 }}>No comments yet</div>}
            <div style={{ display:'flex',gap:6,marginTop:12 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'){ onAddComment(commentText); setCommentText(''); }}}
                placeholder="Write a comment..." style={{ flex:1,background:'#12141f',border:'1px solid #2a2d3e',borderRadius:8,padding:'8px 10px',color:'#e2e8f0',fontSize:12,outline:'none' }}/>
              <button className="btn-primary" style={{ padding:'8px 12px' }} onClick={() => { onAddComment(commentText); setCommentText(''); }}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
