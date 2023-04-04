using System;

namespace Grader.Helper;

[AttributeUsage(AttributeTargets.Method)]
public class GameTaskAttribute : Attribute
{
    //Default 2 minutes, 10 points, no group.
    public GameTaskAttribute(int groupNumber) : this("", 2, 10, groupNumber)
    {
    }

    public GameTaskAttribute(string instruction, int timeLimit, int reward)
        : this(instruction, timeLimit, reward, -1)
    {
    }

    public GameTaskAttribute(string instruction, int timeLimit, int reward, int groupNumber)
    {
        Instruction = instruction;
        TimeLimit = timeLimit;
        Reward = reward;
        GroupNumber = groupNumber;
    }

    public string Instruction { get; }
    public int TimeLimit { get; }
    public int Reward { get; }
    public int GroupNumber { get; }

    public override string ToString()
    {
        return Instruction + "=>" + TimeLimit + "," + Reward + "," + GroupNumber;
    }
}

[AttributeUsage(AttributeTargets.Class)]
public class GameClassAttribute : Attribute
{
    public GameClassAttribute(int order)
    {
        Order = order;
    }

    public int Order { get; }
}