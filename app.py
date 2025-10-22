"""
FDA 510(k) Agentic Review System
Hermes Luxury Style UI - Streamlit Implementation
(Version 6.0 - Final Version with Full Feature Integration)
"""

import streamlit as st
from datetime import datetime
import google.generativeai as genai
import pandas as pd
import yaml
from collections import defaultdict
from xai_sdk import Client as XAI_Client
from xai_sdk.chat import user, system

# --- Page Configuration and Styling ---

st.set_page_config(
    page_title="FDA 510(k) Agentic Review",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# (CSS styling remains the same)
st.markdown("""
<style>
    /* Hermes Orange/Amber Color Palette */
    :root {
        --hermes-orange: #F37021;
        --hermes-brown: #78350F;
        --hermes-gold: #F59E0B;
        --hermes-cream: #FEF3C7;
        --hermes-light-amber: #FED7AA;
    }
    .main { background: linear-gradient(135deg, var(--hermes-cream) 0%, var(--hermes-light-amber) 100%); }
    .stApp > header { background: linear-gradient(90deg, #9A3412 0%, #B45309 50%, #D97706 100%); }
    div[data-testid="metric-container"] { background: rgba(255, 255, 255, 0.6); border: 1px solid var(--hermes-gold); border-radius: 16px; padding: 20px; box-shadow: 0 8px 20px rgba(217, 119, 6, 0.1); backdrop-filter: blur(10px); }
    .stButton>button { background: linear-gradient(90deg, var(--hermes-orange) 0%, var(--hermes-gold) 100%); color: white; border: none; border-radius: 12px; padding: 12px 24px; font-weight: 600; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3); transition: all 0.3s ease; }
    .stButton>button:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(217, 119, 6, 0.4); }
    .stButton>button:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(217, 119, 6, 0.2); }
    section[data-testid="stSidebar"] { background: linear-gradient(180deg, var(--hermes-brown) 0%, #92400E 100%); border-right: 2px solid var(--hermes-gold); }
    section[data-testid="stSidebar"] .stMarkdown { color: var(--hermes-cream); }
    .streamlit-expanderHeader { background: linear-gradient(90deg, var(--hermes-light-amber) 0%, var(--hermes-cream) 100%); border: 1px solid var(--hermes-gold); border-radius: 12px; font-weight: 600; color: var(--hermes-brown); }
    .stTabs [data-baseweb="tab-list"] { gap: 8px; background-color: transparent; }
    .stTabs [data-baseweb="tab"] { background: rgba(255, 255, 255, 0.6); border-radius: 8px; color: var(--hermes-brown); font-weight: 600; border: 1px solid var(--hermes-gold); }
    .stTabs [aria-selected="true"] { background: linear-gradient(90deg, var(--hermes-orange) 0%, var(--hermes-gold) 100%); color: white; border: 1px solid var(--hermes-orange); }
</style>
""", unsafe_allow_html=True)


# --- Session State and Translations ---

# Initialize session state for all required variables
if 'language' not in st.session_state: st.session_state.language = 'en'
if 'selected_agent' not in st.session_state: st.session_state.selected_agent = None
if 'uploaded_docs' not in st.session_state: st.session_state.uploaded_docs = {}
if 'analysis_results' not in st.session_state: st.session_state.analysis_results = {}
if 'selected_model' not in st.session_state: st.session_state.selected_model = "Gemini"
if 'custom_agents' not in st.session_state: st.session_state.custom_agents = []
if 'review_sessions' not in st.session_state: st.session_state.review_sessions = []

TRANSLATIONS = {
    'en': {
        'title': '🛡️ FDA 510(k) Agentic Review', 'subtitle': 'Intelligent Document Analysis & Compliance Verification',
        'dashboard': 'Dashboard', 'agents': 'Agents Library', 'review': 'Document Review', 'language': 'Language',
        'create_agent': 'Create Custom Agent', 'active_sessions': 'Active Sessions', 'ocr_confidence': 'OCR Confidence',
        'agents_running': 'Total Agents', 'avg_review_time': 'Avg Review Time', 'recent_activity': 'Recent Activity',
        'agent_library': 'Agent Library', 'document_viewer': 'Document Viewer', 'checklist': 'Compliance Checklist',
        'generate_mock': 'Generate Mock Submission', 'select_agent': 'Select an Agent to activate', 'run_analysis': '🤖 Analyze with',
        'ai_provider': '🧠 AI Provider', 'api_config': 'API Configuration', 'api_key_required': "🔑 API Key Required",
        'gemini_api_prompt': "Enter your Gemini API Key:", 'xai_api_prompt': "Enter your xAI API Key:",
        'api_success': 'API Key configured!', 'agents_load_error': 'Error loading agents from agents.yaml.',
        'custom_agent_builder': '🛠️ Custom Agent Builder'
    },
    'zh': {
        'title': '🛡️ FDA 510(k) 智能審查系統', 'subtitle': '智能文件分析與合規驗證', 'dashboard': '儀表板', 'agents': '代理庫',
        'review': '文件審查', 'language': '語言', 'create_agent': '創建自定義代理', 'active_sessions': '活躍會話',
        'ocr_confidence': 'OCR 信心度', 'agents_running': '代理總數', 'avg_review_time': '平均審查時間',
        'recent_activity': '最近活動', 'agent_library': '代理庫', 'document_viewer': '文件查看器', 'checklist': '合規清單',
        'generate_mock': '生成模擬提交', 'select_agent': '請選擇一個代理以激活', 'run_analysis': '🤖 使用代理分析',
        'ai_provider': '🧠 AI 提供商', 'api_config': 'API 配置', 'api_key_required': "🔑 需要 API 金鑰",
        'gemini_api_prompt': "請輸入您的 Gemini API 金鑰:", 'xai_api_prompt': "請輸入您的 xAI API 金鑰:",
        'api_success': 'API 金鑰已成功配置！', 'agents_load_error': '從 agents.yaml 加載代理時出錯。',
        'custom_agent_builder': '🛠️ 自定義代理生成器'
    }
}

def t(key):
    return TRANSLATIONS.get(st.session_state.language, TRANSLATIONS['en']).get(key, key)

# --- Core Functions ---

def configure_api(model_provider):
    """Securely configure the API for the selected provider."""
    # This function remains the same as the previous version
    api_key_env_var, api_key_session_state = f"{model_provider.upper()}_API_KEY", f"{model_provider.upper()}_API_KEY"
    try:
        api_key = None
        if hasattr(st, 'secrets') and api_key_env_var in st.secrets: api_key = st.secrets[api_key_env_var]
        elif api_key_session_state in st.session_state: api_key = st.session_state[api_key_session_state]
        if not api_key:
            with st.sidebar:
                st.warning(t('api_key_required'))
                prompt = t('gemini_api_prompt') if model_provider == "Gemini" else t('xai_api_prompt')
                api_key_input = st.text_input(prompt, type="password", key=f"api_key_input_{model_provider}")
                if api_key_input: st.session_state[api_key_session_state] = api_key_input; st.rerun()
            return None
        if api_key:
            if model_provider == "Gemini": genai.configure(api_key=api_key); return genai.GenerativeModel('gemini-2.0-flash')
            elif model_provider == "Grok": return XAI_Client(api_key=api_key, timeout=3600)
        return None
    except Exception as e:
        st.error(f"🔒 {model_provider} Authentication Error: {str(e)}"); return None

def execute_agent(model_provider, model_client, agent_config, document_text):
    """Dispatcher function to run the appropriate agent."""
    # This function remains the same as the previous version
    if not model_client: return {'status': 'error', 'error': f'{model_provider} client not initialized.'}
    try:
        if model_provider == "Gemini":
            prompt = f"**Role:** {agent_config.get('system_prompt', agent_config['name'])}\n\n**Task:** Analyze the following document excerpt.\n\n**Document:**\n---\n{document_text[:12000]}"
            result_text = model_client.generate_content(prompt).text
        elif model_provider == "Grok":
            chat = model_client.chat.create(model="grok-4-fast-reasoning")
            chat.append(system(f"You are {agent_config['name']}. {agent_config.get('system_prompt', '')}"))
            chat.append(user(f"Analyze this document excerpt:\n---\n{document_text[:12000]}"))
            result_text = chat.sample().content
        else: raise ValueError("Unsupported model provider.")
        return {'agent_name': agent_config['name'], 'status': 'success', 'result': result_text, 'timestamp': datetime.now().isoformat()}
    except Exception as e:
        return {'agent_name': agent_config['name'], 'status': 'error', 'error': str(e), 'timestamp': datetime.now().isoformat()}

@st.cache_data
def load_agents_from_yaml():
    """Load and categorize agents from agents.yaml."""
    # This function remains the same as the previous version
    try:
        with open("agents.yaml", 'r', encoding='utf-8') as f:
            all_agents = yaml.safe_load(f).get('agents', [])
        categorized = defaultdict(list)
        for agent in all_agents:
            categorized[agent.get('category', 'Uncategorized')].append(agent)
        return dict(categorized)
    except Exception as e:
        st.error(f"{t('agents_load_error')}: {e}"); return {}

def generate_mock_submission(device_type='Orthopedic Implant'):
    """Generate mock 510(k) submission data."""
    return {
        'device_name': f'Mock {device_type} {datetime.now().strftime("%Y%m%d")}',
        'submission_date': datetime.now().strftime('%Y-%m-%d'),
        'status': 'Pending Review', 'reviewer': 'Dr. Evelyn Reed'
    }

# --- UI Components ---

@st.dialog(t('custom_agent_builder'))
def agent_builder_dialog():
    """A modal dialog for creating a new custom agent."""
    with st.form("agent_builder"):
        st.text_input("Agent Name", key="agent_name", placeholder="My Custom Agent")
        st.text_area("Description", key="agent_desc", placeholder="What does this agent do?")
        st.text_area("System Prompt", key="agent_prompt", placeholder="You are an expert in...", height=150)
        
        if st.form_submit_button("💾 Save Agent", use_container_width=True, type="primary"):
            new_agent = {
                'name': st.session_state.agent_name,
                'description': st.session_state.agent_desc,
                'system_prompt': st.session_state.agent_prompt,
                'category': 'Custom Agents', # All user-created agents go here
                'template_id': f"custom-{datetime.now().timestamp()}"
            }
            st.session_state.custom_agents.append(new_agent)
            st.rerun()

# --- UI: Sidebar ---

with st.sidebar:
    st.markdown(f"## {t('title')}")
    st.divider()
    st.markdown(f"### {t('language')}")
    lang_col1, lang_col2 = st.columns(2)
    if lang_col1.button('🇬🇧 English', use_container_width=True, type="secondary"): st.session_state.language = 'en'; st.rerun()
    if lang_col2.button('🇹🇼 中文', use_container_width=True, type="secondary"): st.session_state.language = 'zh'; st.rerun()
    st.divider()
    st.markdown(f"### {t('ai_provider')}")
    st.session_state.selected_model = st.radio("Select Model", ["Gemini", "Grok"], key="model_selector", horizontal=True, label_visibility="collapsed")
    st.markdown(f"### {t('api_config')}")
    llm_client = configure_api(st.session_state.selected_model)
    if llm_client: st.success(f"{st.session_state.selected_model} {t('api_success')}")
    st.divider()
    st.markdown("### ⚡ Quick Actions")
    if st.button(t('generate_mock'), use_container_width=True):
        st.session_state.review_sessions.append(generate_mock_submission())

# --- Main Application: Tabs ---

st.markdown(f"# {t('title')}")
st.markdown(f"*{t('subtitle')}*")
tab1, tab2, tab3 = st.tabs([f"📊 {t('dashboard')}", f"🤖 {t('agents')}", f"📄 {t('review')}"])

with tab1: # Dashboard
    col1, col2, col3, col4 = st.columns(4)
    col1.metric(t('active_sessions'), len(st.session_state.review_sessions), delta=f"+{len(st.session_state.review_sessions)}" if st.session_state.review_sessions else "0")
    col2.metric(t('ocr_confidence'), "94.2%", delta="+2.1%")
    col3.metric(t('agents_running'), "31", delta="0")
    col4.metric(t('avg_review_time'), "3.8h", delta="-0.4h", delta_color="inverse")
    
    st.divider()
    st.markdown(f"### {t('recent_activity')}")
    activity_data = st.session_state.review_sessions + [
        {'device_name': 'Cardiac Monitor 510k', 'submission_date': '2025-09-30', 'status': '✅ Review Complete', 'reviewer': 'Agent Bot'},
        {'device_name': 'IVD Submission 2024', 'submission_date': '2025-09-28', 'status': '⚠️ Additional Info Requested', 'reviewer': 'Dr. Anya Sharma'}
    ]
    st.dataframe(pd.DataFrame(activity_data), use_container_width=True, hide_index=True)
    
    st.divider()
    chart_col1, chart_col2 = st.columns(2)
    with chart_col1:
        st.markdown("#### 📈 OCR Confidence Trends")
        st.line_chart(pd.DataFrame({'Day': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 'Confidence': [92.1, 93.5, 94.2, 93.8, 94.2]}).set_index('Day'))
    with chart_col2:
        st.markdown("#### 🎯 Agent Performance")
        st.bar_chart(pd.DataFrame({'Agent Type': ['Performance', 'Clinical', 'Documentation', 'Analytics'], 'Count': [12, 8, 15, 6]}).set_index('Agent Type'))

with tab2: # Agents Library
    st.markdown(f"## {t('agent_library')}")
    
    col_btn1, col_btn2 = st.columns([3, 1])
    if col_btn2.button(f"➕ {t('create_agent')}", use_container_width=True):
        agent_builder_dialog()

    agent_categories = load_agents_from_yaml()
    # Add custom agents to the display
    if st.session_state.custom_agents:
        agent_categories['Custom Agents'] = st.session_state.custom_agents

    if not agent_categories:
        st.error("No agents could be loaded.")
    else:
        if st.session_state.selected_agent: st.success(f"**Active Agent:** {st.session_state.selected_agent['name']}")
        else: st.info(t('select_agent'))
        
        for category, agents in sorted(agent_categories.items()):
            with st.expander(f"**{category}** ({len(agents)} agents)", expanded=category == 'Custom Agents' or not st.session_state.custom_agents):
                for agent in agents:
                    col1, col2 = st.columns([4, 1])
                    with col1:
                        st.markdown(f"**{agent['name']}**"); st.caption(agent.get('description', 'No description.'))
                    if col2.button("Activate", key=f"run_{agent.get('template_id', agent['name'])}", use_container_width=True):
                        st.session_state.selected_agent = agent; st.rerun()
                st.write("---")

with tab3: # Document Review
    st.markdown(f"## {t('review')}")
    col_left, col_right = st.columns([2, 1])
    
    with col_left: # Analysis Area
        st.markdown(f"### {t('document_viewer')}")
        uploaded_file = st.file_uploader("Upload Document", type=['txt', 'md'], label_visibility="collapsed")
        
        if uploaded_file:
            if uploaded_file.name not in st.session_state.uploaded_docs:
                st.session_state.uploaded_docs[uploaded_file.name] = uploaded_file.read().decode('utf-8')
            
            with st.container(border=True):
                st.markdown(f"**📄 {uploaded_file.name}**")
                file_content = st.session_state.uploaded_docs.get(uploaded_file.name)
                st.text_area("Content Preview", file_content[:1500], height=200, disabled=True)
                
                if not st.session_state.selected_agent: st.warning("⚠️ Please activate an agent first.", icon="🤖")
                elif not llm_client: st.error(f"🚨 Please configure the {st.session_state.selected_model} API key.", icon="🔑")
                else:
                    if st.button(f"{t('run_analysis')} with **{st.session_state.selected_model}**", use_container_width=True, type="primary"):
                        with st.spinner(f"Analyzing with {st.session_state.selected_agent['name']}..."):
                            result = execute_agent(st.session_state.selected_model, llm_client, st.session_state.selected_agent, file_content)
                            st.session_state.analysis_results[uploaded_file.name] = result; st.rerun()

        st.markdown(f"### 🧠 Analysis Center")
        if not uploaded_file: st.info("📤 Upload a document to begin.")
        elif uploaded_file.name in st.session_state.analysis_results:
            result = st.session_state.analysis_results[uploaded_file.name]
            with st.container(border=True):
                st.markdown(f"#### Analysis for: `{uploaded_file.name}`")
                st.caption(f"Agent: **{result['agent_name']}** | Model: **{st.session_state.selected_model}**")
                st.divider()
                if result['status'] == 'success': st.markdown(result['result'])
                else: st.error(f"An error occurred: {result['error']}")

    with col_right: # Checklist Area
        st.markdown(f"### {t('checklist')}")
        checklist_items = ["Device Description", "Indications for Use", "Predicate Comparison", "Performance Testing", "Biocompatibility", "Sterilization", "Labeling", "Risk Analysis"]
        
        for item in checklist_items:
            st.checkbox(item, key=f"check_{item.replace(' ', '_')}")
        
        st.divider()
        checked_count = sum([st.session_state.get(f"check_{item.replace(' ', '_')}", False) for item in checklist_items])
        progress = checked_count / len(checklist_items)
        
        st.markdown("**Overall Progress**")
        st.progress(progress)
        st.metric("Completion", f"{int(progress * 100)}%")
        
        if progress == 1.0: st.balloons(); st.success("🎉 Review Complete!")

# --- Footer ---
st.divider()
st.markdown("""
<div style='text-align: center; color: #92400E; font-size: 0.9em;'>
    <p><strong>FDA 510(k) Agentic Review System v6.0</strong></p>
    <p>Powered by Google Gemini & xAI Grok</p>
</div>
""", unsafe_allow_html=True)