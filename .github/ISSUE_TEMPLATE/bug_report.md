---
name: Bug report
about: Create a report to help us improve
title: ''
labels: ''
assignees: green-dalii

---

## Bug Description                                                                                                                                         
A clear and concise description of what the bug is.                                                                                                        
                                                                                                                                                             
## Environment                                                                                                                                             
- **Plugin version:** [e.g. 1.7.17]                                                                                                                        
- **Obsidian version:** [e.g. 1.6.6]                                                                                                                       
- **OS:** [e.g. macOS 14.5 / Windows 11 / Linux Ubuntu 22.04]                                                                                              
- **Wiki size:** [e.g. ~50 pages / ~500 pages / ~1200+ pages]                                                                                              
                                                                                                                                                             
## LLM Configuration                                                                                                                                       
- **Provider:** [e.g. Anthropic / OpenAI / Gemini / DeepSeek / Ollama / OpenRouter / Custom]                                                               
- **Model:** [e.g. claude-sonnet-4.6 / gpt-4o / gemini-3.1-pro]                                                                                            
- **API endpoint (if custom):** [e.g. https://api.example.com/v1]                                                                                          
- **Local or cloud:** [e.g. Cloud / Local (Ollama)]                                                                                                        
                                                                                                                                                             
## Steps to Reproduce                                                                                                                                      
1. Go to '...'                                                                                                                                             
2. Click on '...'                                                                                                                                          
3. Scroll down to '...'                                                                                                                                    
4. See error                                                                                                                                               
                                                                                                                                                             
**Example:**                                                                                                                                               
1. Run command "Ingest from Folder" on `sources/` with 50 markdown files
2. Wait for batch processing to complete                                                                                                                   
3. Open `wiki/entities/Example-Entity.md`                                                                                                                  
4. Notice frontmatter `aliases` field is missing                                                                                                           
                                                                                                                                                             
## Expected Behavior                                                                                                                                       
A clear and concise description of what you expected to happen.                                                                                            
                                                                                                                                                             
**Example:**                                                                                                                                               
Entity page should have at least 1 alias in frontmatter (translation, abbreviation, or original name).                                                     
                                                                                                                                                             
## Actual Behavior                                                                                                                                         
A clear and concise description of what actually happened.                                                                                                 
                                                                                                                                                             
**Example:**                                                                                                                                               
Entity page has empty `aliases: []` field, causing duplicate detection to fail in later lint runs.                                                         
                                                                                                                                                             
## Screenshots/Logs                                                                                                                                        
If applicable, add screenshots or error logs to help explain your problem.                                                                                 
                                                                                                                                                             
**Console logs (View → Toggle Developer Tools):**                                                                                                          
Paste any relevant console.debug/warn/error messages here                                                                                                  
                                                                                                                                                             
**Plugin log (if available):**                                  
Check `wiki/log.md` for any recorded errors during the operation.                                                                                          
                                                                                                                                                             
## Additional Context                                                                                                                                      
Add any other context about the problem here.                                                                                                              
                                                                                                                                                             
**Common diagnostic info:**                                                                                                                                
- Did this happen on a fresh vault or existing wiki?                                                                                                       
- Were you using Smart Batch Skip (already-ingested files)?                                                                                                
- Was parallel page generation enabled? (Settings → Ingestion Acceleration)                                                                                
- Any recent manual edits to wiki pages before the bug?                                                                                                    
- Does the bug persist after restarting Obsidian?                                                                                                          
                                                                                                                                                             
## Possible Solution (Optional)                                                                                                                            
If you have ideas on how to fix this, feel free to share.
