import re
content = open('frontend/index.html', encoding='utf-8').read()
start = content.find('id="tab-library"')
# We need the <div that has id="tab-library"
start = content.rfind('<div', 0, start)
end = content.find('id="status-bar"')
# We want the start of status bar
end = content.rfind('<footer', 0, end)

section = content[start:end]
opens = len(re.findall(r'<div\b', section))
closes = len(re.findall(r'</div>', section))
print('Opens:', opens, 'Closes:', closes)
