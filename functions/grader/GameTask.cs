using Google.Cloud.Functions.Framework;
using Microsoft.AspNetCore.Http;
using NUnit.Common;
using NUnitLite;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using System.Reflection;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Linq;
using Grader.Helper;
using System.Net;

namespace Grader;

public class GameTask : IHttpFunction
{
    public async Task HandleAsync(HttpContext context)
    {
        HttpRequest request = context.Request;
        HttpResponse response = context.Response;

        response.Headers.Append("Access-Control-Allow-Origin", "*");
        if (HttpMethods.IsOptions(request.Method))
        {
            response.Headers.Append("Access-Control-Allow-Methods", "GET");
            response.Headers.Append("Access-Control-Allow-Headers", "Content-Type");
            response.Headers.Append("Access-Control-Max-Age", "3600");
            response.StatusCode = (int)HttpStatusCode.NoContent;
            return;
        }

        static IEnumerable<Type> GetTypesWithHelpAttribute(Assembly assembly)
        {
            return from Type type in assembly!.GetTypes()
                   where type.GetCustomAttributes(typeof(GameClassAttribute), true).Length > 0
                   select type;
        }
        var assembly = Assembly.GetAssembly(type: typeof(GameClassAttribute));
        var allTasks = new List<GameTaskData>();
        foreach (var testClass in GetTypesWithHelpAttribute(assembly))
        {
            var gameClass = testClass.GetCustomAttribute<GameClassAttribute>();
            var tasks = testClass.GetMethods().Where(m => m.GetCustomAttribute<GameTaskAttribute>() != null)
                .Select(c => new { c.Name, GameTask = c.GetCustomAttribute<GameTaskAttribute>()! });

            var independentTests = tasks.Where(c => c.GameTask.GroupNumber == -1)
                .Select(c => new GameTaskData()
                {
                    Name = testClass.FullName + "." + c.Name,
                    Tests = new[] { testClass.FullName + "." + c.Name },
                    GameClassOrder = gameClass!.Order,
                    Instruction = c.GameTask.Instruction,
                    Filter = "test=" + testClass.FullName + "." + c.Name,
                    Reward = c.GameTask.Reward,
                    TimeLimit = c.GameTask.TimeLimit
                });


            var groupedTasks = tasks.Where(c => c.GameTask.GroupNumber != -1)
                .GroupBy(c => c.GameTask.GroupNumber)
                .Select(c =>
                    new GameTaskData()
                    {
                        Name = string.Join(" ", c.Select(a => testClass.FullName + "." + a.Name)),
                        Tests = c.Select(a => testClass.FullName + "." + a.Name).ToArray(),
                        GameClassOrder = gameClass!.Order,
                        Instruction = string.Join("", c.Select(a => a.GameTask.Instruction)),
                        Filter = string.Join("||", c.Select(a => "test==\"" + testClass.FullName + "." + a.Name + "\"")),
                        Reward = c.Sum(a => a.GameTask.Reward),
                        TimeLimit = c.Sum(a => a.GameTask.TimeLimit),
                    }
                );

            allTasks.AddRange(independentTests);
            allTasks.AddRange(groupedTasks);
        }

        var serializerSettings = new JsonSerializerSettings
        {
            ContractResolver = new CamelCasePropertyNamesContractResolver()
        };
        allTasks = allTasks.OrderBy(c => c.GameClassOrder).ThenBy(c => c.Tests.First()).ToList();
        var json = JsonConvert.SerializeObject(allTasks.ToArray(), serializerSettings);
        Console.WriteLine(json);
        await context.Response.WriteAsync(json);
    }
}