
require('dotenv').config();
const { OpenAI } = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

function getCurrentAvaibleRoom(){
    return '45';

}
// OpenAI.Chat.ChatCompletionMessage() =
async function callOpenAI(){
    const context = [
        {
            role: 'system',
            content: 'You are a helpful hotel Receptionist.'
        },
        {
            role: 'user',
            content: 'How many rooms are available ?'
        },
        
    ];
    const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: context,
        tools: [
            {
                type : 'function',
                function : {
                    name : 'getCurrentAvaibleRoom',
                    description: 'Get the time of day'
                
                }
            }
        ],
        tool_choice: 'auto' // the engine will decide which tool to use 
    });
    // decide if tool call is required 
    console.log("!@#$%^&*()_")
    console.log(response);
    const willInvokeFunction = response.choices[0].finish_reason == 'tool_calls'
    const toolCall = response.choices[0].message.tool_calls[0];
    
    if(willInvokeFunction){
        const toolName = toolCall.function.name

        if(toolName == 'getCurrentAvaibleRoom'){
            const toolResponse = getCurrentAvaibleRoom();
            context.push(response.choices[0].message);
            context.push({
                role:'tool',
                content: toolResponse,
                tool_call_id: toolCall.id
            })
        }
    }
    const secondResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: context
    
    })
    console.log(secondResponse.choices[0].message.context)

    console.log(response.choices[0].message.content)
}

callOpenAI();